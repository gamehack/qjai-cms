import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const articles = readFileSync(new URL('../src/collections/Articles.ts', import.meta.url), 'utf8')
const serverButton = readFileSync(new URL('../src/components/payload/PublishAllDraftsButton.tsx', import.meta.url), 'utf8')
const clientButton = readFileSync(new URL('../src/components/payload/PublishAllDraftsButtonClient.tsx', import.meta.url), 'utf8')

test('bulk publish endpoints are registered on the Articles collection only', () => {
  assert.match(articles, /path: '\/publish-all',\s*method: 'get'/)
  assert.match(articles, /path: '\/publish-all',\s*method: 'post'/)
  assert.match(articles, /beforeList: \['\/components\/payload\/PublishAllDraftsButton#PublishAllDraftsButton'\]/)
})

test('both preview and publish endpoints require a strict administrator', () => {
  assert.equal((articles.match(/if \(!isAdminUser\(req\.user\)\) return forbiddenResponse\(\)/g) ?? []).length, 2)
  assert.match(serverButton, /if \(!isAdminUser\(user\)\) return null/)
})

test('bulk write is restricted to documents still in draft and respects Payload access and locks', () => {
  assert.match(articles, /where: \{ status: \{ equals: 'draft' \} \},\s*data: \{ status: 'published' \}/)
  assert.match(articles, /overrideAccess: false/)
  assert.match(articles, /overrideLock: false/)
  assert.match(articles, /remainingDraftCount/)
})

test('admin UI previews count and requires explicit confirmation before publishing', () => {
  assert.match(clientButton, /method: 'GET'/)
  assert.match(clientButton, /window\.confirm\(/)
  assert.match(clientButton, /method: 'POST'/)
  assert.match(clientButton, /credentials: 'include'/)
  assert.match(clientButton, /不要连续重复提交/)
  assert.match(clientButton, /disabled=\{busy\}/)
})

test('bulk publish UI reports partial failures and refreshes the collection list', () => {
  assert.match(clientButton, /result\.failedCount/)
  assert.match(clientButton, /result\.remainingDraftCount/)
  assert.match(clientButton, /router\.refresh\(\)/)
})
