import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isAuthorized, isValidHttpsUrl, isValidSource, readLimitedBody } from '@/lib/ingest-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 220_000

function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

export async function POST(req: NextRequest) {
  const secret = process.env.CONTENT_INGEST_TOKEN
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: 'ingest_disabled' }, { status: 503 })
  }
  if (!isAuthorized(req.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    return NextResponse.json({ error: 'unsupported_media_type' }, { status: 415 })
  }

  const contentLength = req.headers.get('content-length')
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 })
  }

  const bodyResult = await readLimitedBody(req.body, MAX_BODY_BYTES)
  if (!bodyResult.ok) {
    const status = bodyResult.reason === 'too_large' ? 413 : 400
    return NextResponse.json({ error: bodyResult.reason }, { status })
  }

  let data: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(bodyResult.body)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('not object')
    data = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const source = data.source
  if (!isValidSource(source)) {
    return NextResponse.json({ error: 'invalid_source' }, { status: 422 })
  }
  if (!validText(data.externalId, 200) || !validText(data.title, 200) ||
      !validText(data.summary, 2000) || !validText(data.bodyMarkdown, 180_000)) {
    return NextResponse.json({ error: 'invalid_content' }, { status: 422 })
  }

  const typedSource = source
  const sourceKey = `${typedSource}:${data.externalId}`
  const digest = createHash('sha256').update(sourceKey).digest('hex').slice(0, 16)
  const slug = `${typedSource}-${digest}`
  if (data.originalUrl !== undefined && data.originalUrl !== null && data.originalUrl !== '' && !isValidHttpsUrl(data.originalUrl)) {
    return NextResponse.json({ error: 'invalid_original_url' }, { status: 422 })
  }
  const originalUrl = isValidHttpsUrl(data.originalUrl) ? data.originalUrl : undefined

  try {
    const payload = await getPayload({ config })
    const found = await payload.find({
      collection: 'articles',
      where: { sourceKey: { equals: sourceKey } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs.length) {
      return NextResponse.json({ id: found.docs[0].id, slug, duplicate: true }, { status: 200 })
    }

    try {
      const created = await payload.create({
        collection: 'articles',
        overrideAccess: true,
        data: {
          title: data.title.trim(),
          slug,
          summary: data.summary.trim(),
          bodyMarkdown: data.bodyMarkdown,
          source: typedSource,
          sourceKey,
          originalUrl,
          aiGenerated: true,
          status: 'draft',
        },
      })
      return NextResponse.json({ id: created.id, slug, status: 'draft', duplicate: false }, { status: 201 })
    } catch (createError) {
      // A concurrent duplicate may hit the unique constraint; do not overwrite editorial changes.
      const raced = await payload.find({
        collection: 'articles',
        where: { sourceKey: { equals: sourceKey } },
        limit: 1,
        overrideAccess: true,
      })
      if (raced.docs.length) {
        return NextResponse.json({ id: raced.docs[0].id, slug, duplicate: true }, { status: 200 })
      }
      throw createError
    }
  } catch (error) {
    console.error('ingest failed', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: 'storage_failure' }, { status: 500 })
  }
}
