import { createHash, timingSafeEqual } from 'node:crypto'

export type LimitedBodyResult =
  | { ok: true; body: string }
  | { ok: false; reason: 'too_large' | 'invalid_body' }

export function isAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header) return false
  const received = Buffer.from(header, 'utf8')
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<LimitedBodyResult> {
  if (!body || !Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    return { ok: false, reason: 'invalid_body' }
  }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel()
        } catch {
          // The size limit has already been enforced.
        }
        return { ok: false, reason: 'too_large' }
      }
      chunks.push(value)
    }
  } catch {
    try {
      await reader.cancel()
    } catch {
      // Preserve the generic invalid-body response.
    }
    return { ok: false, reason: 'invalid_body' }
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return { ok: true, body: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return { ok: false, reason: 'invalid_body' }
  }
}

export function isValidSource(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,49}$/.test(value)
}

export function isValidOriginalUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) &&
      !url.username && !url.password
  } catch {
    return false
  }
}

export function buildSourceKey(source: string, externalId: string): string {
  return `${source}:${externalId.trim()}`
}

export function buildArticleSlug(sourceKey: string): string {
  const digest = createHash('sha256').update(sourceKey).digest('hex').slice(0, 32)
  const source = sourceKey.slice(0, sourceKey.indexOf(':'))
  return `${source}-${digest}`
}
