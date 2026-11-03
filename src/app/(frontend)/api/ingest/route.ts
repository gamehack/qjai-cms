import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { buildArticleSlug, buildSourceKey, isAuthorized, isValidCategorySlug, isValidOriginalUrl, isValidSource, readLimitedBody } from '@/lib/ingest-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 220_000

function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(req: NextRequest) {
  const secret = process.env.CONTENT_INGEST_TOKEN
  if (!secret || secret.length < 32) {
    return json({ error: 'ingest_disabled' }, 503)
  }
  if (!isAuthorized(req.headers.get('authorization'), secret)) {
    return json({ error: 'unauthorized' }, 401)
  }

  const contentType = req.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    return json({ error: 'unsupported_media_type' }, 415)
  }

  const contentLength = req.headers.get('content-length')
  if (contentLength && !/^\d+$/.test(contentLength)) {
    return json({ error: 'invalid_content_length' }, 400)
  }
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return json({ error: 'too_large' }, 413)
  }

  const bodyResult = await readLimitedBody(req.body, MAX_BODY_BYTES)
  if (!bodyResult.ok) {
    const status = bodyResult.reason === 'too_large' ? 413 : 400
    return json({ error: bodyResult.reason }, status)
  }

  let data: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(bodyResult.body)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('not object')
    data = parsed as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const source = data.source
  if (!isValidSource(source)) {
    return json({ error: 'invalid_source' }, 422)
  }
  if (!validText(data.externalId, 200) || !validText(data.title, 200) ||
      !validText(data.summary, 2000) || !validText(data.bodyMarkdown, 180_000)) {
    return json({ error: 'invalid_content' }, 422)
  }
  if (data.originalUrl !== undefined && data.originalUrl !== null && data.originalUrl !== '' &&
      !isValidOriginalUrl(data.originalUrl)) {
    return json({ error: 'invalid_original_url' }, 422)
  }

  // categorySlug is optional; null is equivalent to omission.
  // Validate before any article lookup, so invalid category requests never write.
  const categorySlug = data.categorySlug
  if (categorySlug !== undefined && categorySlug !== null &&
      !isValidCategorySlug(categorySlug)) {
    return json({ error: 'invalid_category_slug' }, 422)
  }

  const typedSource = source
  const externalId = (data.externalId as string).trim()
  const sourceKey = buildSourceKey(typedSource, externalId)
  const slug = buildArticleSlug(sourceKey)
  const originalUrl = typeof data.originalUrl === 'string' && data.originalUrl.length
    ? data.originalUrl
    : undefined

  try {
    const payload = await getPayload({ config })
    let categoryId: string | number | undefined
    if (typeof categorySlug === 'string') {
      const categories = await payload.find({
        collection: 'categories',
        where: { slug: { equals: categorySlug } },
        limit: 1,
        depth: 0,
        overrideAccess: false,
      })
      if (!categories.docs.length) {
        return json({ error: 'category_not_found' }, 422)
      }
      categoryId = categories.docs[0].id
    }

    const found = await payload.find({
      collection: 'articles',
      where: { sourceKey: { equals: sourceKey } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs.length) {
      return json({ id: found.docs[0].id, slug: found.docs[0].slug, duplicate: true }, 200)
    }

    try {
      const created = await payload.create({
        collection: 'articles',
        overrideAccess: true,
        data: {
          title: (data.title as string).trim(),
          slug,
          summary: (data.summary as string).trim(),
          bodyMarkdown: data.bodyMarkdown,
          source: typedSource,
          sourceKey,
          originalUrl,
          ...(categoryId === undefined ? {} : { category: categoryId }),
          aiGenerated: true,
          status: 'draft',
        },
      })
      return json({ id: created.id, slug, status: 'draft', duplicate: false }, 201)
    } catch (createError) {
      // A concurrent duplicate may hit the unique constraint; do not overwrite editorial changes.
      const raced = await payload.find({
        collection: 'articles',
        where: { sourceKey: { equals: sourceKey } },
        limit: 1,
        overrideAccess: true,
      })
      if (raced.docs.length) {
        return json({ id: raced.docs[0].id, slug: raced.docs[0].slug, duplicate: true }, 200)
      }
      throw createError
    }
  } catch (error) {
    console.error('ingest failed', error instanceof Error ? error.name : 'unknown')
    return json({ error: 'storage_failure' }, 500)
  }
}
