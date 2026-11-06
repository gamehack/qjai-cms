import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const route = readFileSync(new URL('../src/app/(frontend)/api/ingest/route.ts', import.meta.url), 'utf8')

test('authenticated GET lookup is read-only and keyed by sourceKey', () => {
  const getHandler = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
  assert.match(getHandler, /authorize\(req\)/)
  assert.match(getHandler, /buildSourceKey\(source, externalId\)/)
  assert.match(getHandler, /where: \{ sourceKey: \{ equals: sourceKey \} \}/)
  assert.doesNotMatch(getHandler, /payload\.create|payload\.update|payload\.delete/)
})

test('lookup returns only delivery metadata, not article content', () => {
  const getHandler = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
  assert.match(getHandler, /found: true/)
  assert.doesNotMatch(getHandler, /bodyMarkdown|summary|title:/)
})
