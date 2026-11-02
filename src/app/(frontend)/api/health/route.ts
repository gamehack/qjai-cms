import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    // A tiny authenticated server-side query checks that the application can
    // reach PostgreSQL without exposing connection details or query errors.
    await payload.find({
      collection: 'users',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return NextResponse.json({ ok: true, service: 'qjai-cms', database: 'reachable' })
  } catch {
    return NextResponse.json(
      { ok: false, service: 'qjai-cms', database: 'unavailable' },
      { status: 503 },
    )
  }
}
