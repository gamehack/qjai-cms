import assert from 'node:assert/strict'
import test from 'node:test'
import { buildArticleSlug, buildSourceKey, isAuthorized, isValidCategorySlug, isValidExternalId, isValidOriginalUrl, isValidSource, readLimitedBody } from '../src/lib/ingest-security.ts'

function streamFrom(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

test('accepts only the configured bearer token', () => {
  const secret = 'a'.repeat(32)
  assert.equal(isAuthorized(`Bearer ${secret}`, secret), true)
  assert.equal(isAuthorized(`Bearer ${'b'.repeat(32)}`, secret), false)
  assert.equal(isAuthorized(null, secret), false)
  assert.equal(isAuthorized(`Bearer ${secret}`, 'short'), false)
  assert.equal(isAuthorized(`Bearer ${secret}`, undefined), false)
})

test('reads valid UTF-8 across chunk boundaries', async () => {
  const bytes = new TextEncoder().encode('{"title":"content"}')
  const result = await readLimitedBody(
    streamFrom([bytes.slice(0, 7), bytes.slice(7)]),
    bytes.byteLength,
  )
  assert.deepEqual(result, { ok: true, body: '{"title":"content"}' })
})

test('accepts a body exactly at the byte limit', async () => {
  const bytes = new TextEncoder().encode('12345')
  const result = await readLimitedBody(streamFrom([bytes]), 5)
  assert.deepEqual(result, { ok: true, body: '12345' })
})

test('rejects an oversized stream and cancels further reading', async () => {
  let cancelled = false
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(4))
    },
    cancel() {
      cancelled = true
    },
  })
  const result = await readLimitedBody(stream, 3)
  assert.deepEqual(result, { ok: false, reason: 'too_large' })
  assert.equal(cancelled, true)
})

test('rejects invalid UTF-8', async () => {
  const result = await readLimitedBody(streamFrom([new Uint8Array([0xff, 0xfe])]), 10)
  assert.deepEqual(result, { ok: false, reason: 'invalid_body' })
})

test('rejects a missing stream or invalid byte limit', async () => {
  assert.deepEqual(await readLimitedBody(null, 10), { ok: false, reason: 'invalid_body' })
  assert.deepEqual(await readLimitedBody(streamFrom([]), -1), { ok: false, reason: 'invalid_body' })
})

test('accepts generic lowercase source identifiers', () => {
  assert.equal(isValidSource('example-source'), true)
  assert.equal(isValidSource('rss_feed_1'), true)
  assert.equal(isValidSource('A-source'), false)
  assert.equal(isValidSource('has spaces'), false)
  assert.equal(isValidSource(''), false)
  assert.equal(isValidSource('a'.repeat(51)), false)
})

test('validates source IDs without accepting paths or whitespace', () => {
  assert.equal(isValidSource('valid_source-2'), true)
  assert.equal(isValidSource('../admin'), false)
  assert.equal(isValidSource('source/child'), false)
})

test('accepts bounded machine external IDs without query or path characters', () => {
  for (const value of ['2026-11-06', 'weekly:2026-11-02', 'monthly:2026-10', 'snapshot_1']) {
    assert.equal(isValidExternalId(value), true, value)
  }
  for (const value of ['', ' 2026-11-06', '2026-11-06 ', '../admin', 'x/y', 'x?y', 'x#y', 'a'.repeat(201)]) {
    assert.equal(isValidExternalId(value), false, value)
  }
})

test('accepts only credential-free HTTPS source URLs', () => {
  assert.equal(isValidOriginalUrl('https://example.com/article'), true)
  assert.equal(isValidOriginalUrl('http://example.com/article'), false)
  assert.equal(isValidOriginalUrl('javascript:alert(1)'), false)
  assert.equal(isValidOriginalUrl('https://user:pass@example.com/'), false)
  assert.equal(isValidOriginalUrl('not a url'), false)
  assert.equal(isValidOriginalUrl('https://example.com/' + 'a'.repeat(2000)), false)
})

test('normalizes external IDs and produces stable 128-bit slug suffixes', () => {
  const key = buildSourceKey('example-source', '  external-42  ')
  assert.equal(key, 'example-source:external-42')
  const slug = buildArticleSlug(key)
  assert.match(slug, /^example-source-[a-f0-9]{32}$/)
  assert.equal(buildArticleSlug(key), slug)
  assert.notEqual(buildArticleSlug(key), buildArticleSlug('example-source:external-43'))
})


test('validates optional category slugs and preserves case', () => {
  for (const slug of ['producthunt', 'x', 'TrustMRR', 'category-1', '中文分类', 'tag_name']) {
    assert.equal(isValidCategorySlug(slug), true, slug)
  }
  for (const invalid of ['', ' ', ' x', 'x ', '/category/x', 'x/y', 'x?debug',
                         'x#fragment', 'x%20', 123, null, [], {}, 'a'.repeat(101)]) {
    assert.equal(isValidCategorySlug(invalid), false, String(invalid))
  }
})
