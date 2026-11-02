import assert from 'node:assert/strict'

const baseURL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const ingestToken = process.env.CONTENT_INGEST_TOKEN
assert.ok(ingestToken && ingestToken.length >= 32, 'CONTENT_INGEST_TOKEN must be configured')

async function request(path, { method = 'GET', token, body, contentType = 'application/json' } = {}) {
  const headers = {}
  if (token) headers.Authorization = `JWT ${token}`
  if (body !== undefined) headers['Content-Type'] = contentType
  const response = await fetch(`${baseURL}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : contentType === 'application/json' ? JSON.stringify(body) : body,
  })
  const text = await response.text()
  let data
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text.slice(0, 500) } }
  return { status: response.status, data }
}

function status(result, expected, label) {
  assert.equal(result.status, expected, `${label}: expected ${expected}, received ${result.status}; body=${JSON.stringify(result.data)}`)
}

const suffix = Date.now().toString()
const adminEmail = `cms-admin-${suffix}@example.invalid`
const editorEmail = `cms-editor-${suffix}@example.invalid`
const password = 'CI-only-Strong-Passphrase-2026!'

console.log('1/7 Verify unauthenticated user access is denied')
const publicUsers = await request('/users')
assert.ok([401, 403].includes(publicUsers.status), `public users endpoint unexpectedly returned ${publicUsers.status}`)
const publicCreate = await request('/users', {
  method: 'POST',
  body: { email: `attacker-${suffix}@example.invalid`, password, isAdmin: true },
})
assert.ok([401, 403].includes(publicCreate.status), `unauthenticated user creation unexpectedly returned ${publicCreate.status}`)

console.log('2/7 Bootstrap exactly one first administrator')
const firstRegister = await request('/users/first-register', {
  method: 'POST',
  body: { email: adminEmail, password },
})
status(firstRegister, 200, 'first-user registration')
const adminToken = firstRegister.data.token
assert.ok(typeof adminToken === 'string' && adminToken.length > 20, 'first-user registration did not return an auth token')
const adminMe = await request('/users/me', { token: adminToken })
status(adminMe, 200, 'administrator session')
assert.equal(adminMe.data.user?.isAdmin, true, 'first registered account was not promoted to administrator')

const secondRegister = await request('/users/first-register', {
  method: 'POST',
  body: { email: `second-admin-${suffix}@example.invalid`, password },
})
assert.ok([401, 403].includes(secondRegister.status), 'first-user registration remained open after bootstrap')

console.log('3/7 Verify administrator can create an editor, but editor cannot self-promote')
const editorCreate = await request('/users', {
  method: 'POST',
  token: adminToken,
  body: { email: editorEmail, password, displayName: 'CI Editor', isAdmin: false },
})
status(editorCreate, 201, 'administrator creates editor')
assert.equal(editorCreate.data.doc?.isAdmin, false, 'new editor unexpectedly became administrator')

const editorLogin = await request('/users/login', {
  method: 'POST',
  body: { email: editorEmail, password },
})
status(editorLogin, 200, 'editor login')
const editorToken = editorLogin.data.token
assert.ok(typeof editorToken === 'string' && editorToken.length > 20, 'editor login did not return token')
const editorMe = await request('/users/me', { token: editorToken })
status(editorMe, 200, 'editor session')
assert.equal(editorMe.data.user?.isAdmin, false, 'editor session unexpectedly has administrator role')

const selfPromotion = await request(`/users/${editorCreate.data.doc.id}`, {
  method: 'PATCH',
  token: editorToken,
  body: { isAdmin: true },
})
assert.ok([401, 403].includes(selfPromotion.status), 'editor could update their own administrator flag')

console.log('4/7 Verify editor cannot publish and admin publication timestamps are populated')
const editorPublish = await request('/articles', {
  method: 'POST',
  token: editorToken,
  body: {
    title: `Editor publication attempt ${suffix}`,
    slug: `ci-editor-attempt-${suffix}`,
    summary: 'CI editorial permission test',
    bodyMarkdown: 'This content must remain in review.',
    status: 'published',
    source: 'ci',
  },
})
status(editorPublish, 201, 'editor creates article')
assert.equal(editorPublish.data.doc?.status, 'review', 'editor was able to publish directly')
assert.equal(editorPublish.data.doc?.publishedAt ?? null, null, 'editor review item unexpectedly has a publication timestamp')

const adminPublish = await request('/articles', {
  method: 'POST',
  token: adminToken,
  body: {
    title: `Admin publication ${suffix}`,
    slug: `ci-admin-published-${suffix}`,
    summary: 'CI public read policy test',
    bodyMarkdown: 'Published by administrator.',
    status: 'published',
    source: 'ci',
  },
})
status(adminPublish, 201, 'administrator publishes article')
const publishedId = adminPublish.data.doc?.id
assert.ok(publishedId !== undefined, 'administrator publish response omitted article id')
assert.ok(adminPublish.data.doc?.publishedAt, 'published article is missing publishedAt')

console.log('5/7 Verify editors cannot alter published articles')
const editorUpdatePublished = await request(`/articles/${publishedId}`, {
  method: 'PATCH',
  token: editorToken,
  body: { title: 'Unauthorized edit attempt' },
})
assert.ok([401, 403].includes(editorUpdatePublished.status), 'editor updated an already-published article')
const editorDeletePublished = await request(`/articles/${publishedId}`, {
  method: 'DELETE',
  token: editorToken,
})
assert.ok([401, 403].includes(editorDeletePublished.status), 'editor deleted an already-published article')

console.log('6/7 Verify anonymous readers only see published articles')
const publicArticles = await request('/articles?limit=100')
status(publicArticles, 200, 'public article listing')
const publicSlugs = (publicArticles.data.docs || []).map(doc => doc.slug)
assert.ok(publicSlugs.includes(`ci-admin-published-${suffix}`), 'public article listing omitted published content')
assert.ok(!publicSlugs.includes(`ci-editor-attempt-${suffix}`), 'public article listing exposed editor review content')

console.log('7/7 Verify ingestion HTTP validation and idempotency')
status(await request('/ingest', { method: 'POST', body: {} }), 401, 'ingest without bearer token')
status(await request('/ingest', {
  method: 'POST',
  token: undefined,
  body: '{}',
  contentType: 'text/plain',
}), 401, 'ingest rejects missing token before parsing')
const unsupported = await fetch(`${baseURL}/api/ingest`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ingestToken}`, 'Content-Type': 'text/plain' },
  body: '{}',
})
status({ status: unsupported.status, data: {} }, 415, 'ingest media type')
const malformed = await fetch(`${baseURL}/api/ingest`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ingestToken}`, 'Content-Type': 'application/json' },
  body: '{',
})
status({ status: malformed.status, data: {} }, 400, 'ingest malformed JSON')
const invalid = await fetch(`${baseURL}/api/ingest`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ingestToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ source: 'bad source', externalId: 'x', title: 'x', summary: 'x', bodyMarkdown: 'x' }),
})
status({ status: invalid.status, data: {} }, 422, 'ingest invalid source')
const oversized = await fetch(`${baseURL}/api/ingest`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ingestToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ padding: 'x'.repeat(221_000) }),
})
status({ status: oversized.status, data: {} }, 413, 'ingest oversized body')

const ingestBody = {
  source: 'ci-test',
  externalId: `external-${suffix}`,
  title: `Ingested draft ${suffix}`,
  summary: 'CI ingestion idempotency test',
  bodyMarkdown: 'Imported content must remain a draft.',
  originalUrl: 'https://example.com/source',
}
const firstIngest = await fetch(`${baseURL}/api/ingest`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ingestToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(ingestBody),
})
const firstIngestData = await firstIngest.json()
status({ status: firstIngest.status, data: firstIngestData }, 201, 'first ingest')
assert.equal(firstIngestData.status, 'draft')
const duplicateIngest = await fetch(`${baseURL}/api/ingest`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ingestToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...ingestBody, title: 'This replay must not overwrite editorial content' }),
})
const duplicateData = await duplicateIngest.json()
status({ status: duplicateIngest.status, data: duplicateData }, 200, 'duplicate ingest')
assert.equal(duplicateData.duplicate, true)

console.log('PASS: auth bootstrap, role permissions, publication visibility and ingestion contract')
