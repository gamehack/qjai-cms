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
assert.ok([200, 401, 403].includes(selfPromotion.status), 'unexpected response to editor self-promotion attempt')
if (selfPromotion.status === 200) {
  assert.equal(selfPromotion.data.doc?.isAdmin, false, 'editor promoted their own account')
}

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


console.log('Verify optional categorySlug validation, association, and replay protection')
const ingest = async body => {
  const response = await fetch(`${baseURL}/api/ingest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ingestToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, data: await response.json() }
}
const categorySlug = `ci-category-${suffix}`
const otherSlug = `ci-other-${suffix}`
const firstCategory = await request('/categories', {
  method: 'POST',
  token: adminToken,
  body: { name: 'CI category', slug: categorySlug },
})
status(firstCategory, 201, 'administrator creates category')
const secondCategory = await request('/categories', {
  method: 'POST',
  token: adminToken,
  body: { name: 'CI editor category', slug: otherSlug },
})
status(secondCategory, 201, 'administrator creates secondary category')
const categoryId = firstCategory.data.doc.id
const otherCategoryId = secondCategory.data.doc.id
const getCategoryId = value => value && typeof value === 'object' ? value.id : value

for (const invalidSlug of ['', ' ', ' x', '/path', 12, false, [], {}]) {
  const result = await ingest({
    ...ingestBody, externalId: `invalid-${suffix}`, categorySlug: invalidSlug,
  })
  status(result, 422, 'invalid category slug')
  assert.equal(result.data.error, 'invalid_category_slug')
}
const missingCategory = await ingest({
  ...ingestBody, externalId: `missing-${suffix}`, categorySlug: `missing-${suffix}`,
})
status(missingCategory, 422, 'unknown category slug')
assert.equal(missingCategory.data.error, 'category_not_found')

const categorized = await ingest({
  ...ingestBody, externalId: `categorized-${suffix}`, categorySlug,
})
status(categorized, 201, 'categorized ingest')
assert.equal(categorized.data.status, 'draft')
const categorizedArticle = await request(`/articles/${categorized.data.id}`, { token: adminToken })
status(categorizedArticle, 200, 'read categorized article')
assert.equal(String(getCategoryId(categorizedArticle.data.category)), String(categoryId))
assert.equal(categorizedArticle.data.status, 'draft')

// A later manual editorial category change is never overwritten by a replay.
const editorialCategoryChange = await request(`/articles/${categorized.data.id}`, {
  method: 'PATCH', token: adminToken, body: { category: otherCategoryId },
})
status(editorialCategoryChange, 200, 'manual editor category change')
const replay = await ingest({
  ...ingestBody,
  externalId: `categorized-${suffix}`,
  title: 'This replay must not overwrite editorial title',
  categorySlug,
})
status(replay, 200, 'categorized duplicate')
assert.equal(replay.data.duplicate, true)
const afterReplay = await request(`/articles/${categorized.data.id}`, { token: adminToken })
status(afterReplay, 200, 'read article after replay')
assert.equal(String(getCategoryId(afterReplay.data.category)), String(otherCategoryId))
assert.equal(afterReplay.data.title, ingestBody.title)

const nullCategory = await ingest({
  ...ingestBody, externalId: `null-category-${suffix}`, categorySlug: null,
})
status(nullCategory, 201, 'null category treated as omitted')
const nullArticle = await request(`/articles/${nullCategory.data.id}`, { token: adminToken })
status(nullArticle, 200, 'read unclassified article')
assert.equal(nullArticle.data.category ?? null, null)


console.log('8/8 Verify bulk publish is administrator-only and publishes drafts only')
const anonymousBulkPreview = await request('/articles/publish-all')
assert.ok([401, 403].includes(anonymousBulkPreview.status), 'anonymous user accessed bulk-publish preview')
const anonymousBulkPublish = await request('/articles/publish-all', { method: 'POST' })
assert.ok([401, 403].includes(anonymousBulkPublish.status), 'anonymous user accessed bulk publish')
const editorBulkPreview = await request('/articles/publish-all', { token: editorToken })
status(editorBulkPreview, 403, 'editor bulk-publish preview')
const editorBulkPublish = await request('/articles/publish-all', { method: 'POST', token: editorToken })
status(editorBulkPublish, 403, 'editor bulk publish')

const bulkDrafts = []
for (let index = 0; index < 2; index += 1) {
  const created = await request('/articles', {
    method: 'POST',
    token: adminToken,
    body: {
      title: `Bulk publish draft ${index} ${suffix}`,
      slug: `ci-bulk-draft-${index}-${suffix}`,
      summary: 'Bulk publication integration test',
      bodyMarkdown: 'This draft should be published by the administrator action.',
      status: 'draft',
      source: 'ci',
    },
  })
  status(created, 201, 'administrator creates bulk-publish draft')
  bulkDrafts.push(created.data.doc)
}

const bulkReview = await request('/articles', {
  method: 'POST',
  token: adminToken,
  body: {
    title: `Bulk publish review ${suffix}`,
    slug: `ci-bulk-review-${suffix}`,
    summary: 'This review item must not be published by bulk action',
    bodyMarkdown: 'Review status must remain unchanged.',
    status: 'review',
    source: 'ci',
  },
})
status(bulkReview, 201, 'administrator creates review item')
assert.equal(bulkReview.data.doc.status, 'review')

const bulkPreview = await request('/articles/publish-all', { token: adminToken })
status(bulkPreview, 200, 'administrator bulk-publish preview')
assert.ok(bulkPreview.data.draftCount >= bulkDrafts.length, 'preview omitted known draft articles')

const bulkResult = await request('/articles/publish-all', { method: 'POST', token: adminToken })
status(bulkResult, 200, 'administrator bulk publish')
assert.equal(bulkResult.data.draftCountBefore, bulkPreview.data.draftCount)
assert.equal(bulkResult.data.publishedCount, bulkPreview.data.draftCount)
assert.equal(bulkResult.data.failedCount, 0)
assert.equal(bulkResult.data.remainingDraftCount, 0)

for (const draft of bulkDrafts) {
  const published = await request(`/articles/${draft.id}`, { token: adminToken })
  status(published, 200, 'read bulk-published article')
  assert.equal(published.data.status, 'published')
  assert.ok(published.data.publishedAt, 'bulk-published article is missing publishedAt')
}
const stillReview = await request(`/articles/${bulkReview.data.doc.id}`, { token: adminToken })
status(stillReview, 200, 'read review item after bulk publish')
assert.equal(stillReview.data.status, 'review')
assert.equal(stillReview.data.publishedAt ?? null, null)

const existingPublishedAfterBulk = await request(`/articles/${publishedId}`, { token: adminToken })
status(existingPublishedAfterBulk, 200, 'read previously published article after bulk publish')
assert.equal(existingPublishedAfterBulk.data.status, 'published')
assert.equal(existingPublishedAfterBulk.data.publishedAt, adminPublish.data.doc.publishedAt)

const repeatedBulkPublish = await request('/articles/publish-all', { method: 'POST', token: adminToken })
status(repeatedBulkPublish, 200, 'repeat bulk publish')
assert.equal(repeatedBulkPublish.data.publishedCount, 0)
assert.equal(repeatedBulkPublish.data.remainingDraftCount, 0)

const publicAfterBulk = await request('/articles?limit=100')
status(publicAfterBulk, 200, 'public list after bulk publish')
const publicAfterBulkSlugs = (publicAfterBulk.data.docs || []).map(doc => doc.slug)
for (const draft of bulkDrafts) {
  assert.ok(publicAfterBulkSlugs.includes(draft.slug), 'published draft is not visible to anonymous readers')
}
assert.ok(!publicAfterBulkSlugs.includes(bulkReview.data.doc.slug), 'bulk publish exposed review content')

console.log('PASS: auth bootstrap, role permissions, publication visibility, ingestion and admin bulk publish')
