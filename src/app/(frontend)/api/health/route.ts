import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    // A real database read makes this a readiness check, not just a process check.
    await payload.find({
      collection: 'articles',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    return NextResponse.json(
      { ok: true, service: 'qjai-cms', checks: { database: 'ok' } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    // Never expose connection strings, SQL errors, or adapter details publicly.
    return NextResponse.json(
      { ok: false, service: 'qjai-cms', checks: { database: 'unavailable' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
