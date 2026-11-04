import assert from 'node:assert/strict'
import test from 'node:test'
import { Articles } from '../src/collections/Articles.ts'

const endpoints = Articles.endpoints ?? []
const previewEndpoint = endpoints.find(endpoint => endpoint.path === '/publish-all' && endpoint.method === 'get')
const publishEndpoint = endpoints.find(endpoint => endpoint.path === '/publish-all' && endpoint.method === 'post')

assert.ok(previewEndpoint, 'admin draft-count endpoint must be registered')
assert.ok(publishEndpoint, 'admin bulk-publish endpoint must be registered')

function makeRequest({ user = null, counts = [0], updateResult = { docs: [], errors: [] } } = {}) {
  let countIndex = 0
  const calls = { count: [], update: [] }
  const req = {
    user,
    payload: {
      count: async args => {
        calls.count.push(args)
        const totalDocs = counts[Math.min(countIndex, counts.length - 1)]
        countIndex += 1
        return { totalDocs }
      },
      update: async args => {
        calls.update.push(args)
        return updateResult
      },
    },
  }
  return { req, calls }
}

async function body(response) {
  return response.json()
}

test('bulk publish endpoints reject anonymous users and editors before database access', async () => {
  for (const user of [null, { id: 2, isAdmin: false }, { id: 3 }]) {
    const { req, calls } = makeRequest({ user })
    assert.equal((await previewEndpoint.handler(req)).status, 403)
    assert.equal((await publishEndpoint.handler(req)).status, 403)
    assert.equal(calls.count.length, 0)
    assert.equal(calls.update.length, 0)
  }
})

test('admin preview counts only drafts and disables caching', async () => {
  const { req, calls } = makeRequest({
    user: { id: 1, isAdmin: true },
    counts: [7],
  })
  const response = await previewEndpoint.handler(req)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await body(response), { draftCount: 7 })
  assert.equal(calls.count.length, 1)
  assert.deepEqual(calls.count[0].where, { status: { equals: 'draft' } })
  assert.equal(calls.count[0].overrideAccess, false)
  assert.equal(calls.count[0].req, req)
  assert.equal(calls.count[0].user, req.user)
})

test('admin bulk publish updates drafts only, respects access and document locks', async () => {
  const { req, calls } = makeRequest({
    user: { id: 1, isAdmin: true },
    counts: [2, 0],
    updateResult: { docs: [{ id: 10 }, { id: 11 }], errors: [] },
  })
  const response = await publishEndpoint.handler(req)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await body(response), {
    draftCountBefore: 2,
    publishedCount: 2,
    failedCount: 0,
    skippedCount: 0,
    remainingDraftCount: 0,
  })
  assert.equal(calls.count.length, 2)
  assert.equal(calls.update.length, 1)
  assert.deepEqual(calls.update[0].where, { status: { equals: 'draft' } })
  assert.deepEqual(calls.update[0].data, { status: 'published' })
  assert.equal(calls.update[0].overrideAccess, false)
  assert.equal(calls.update[0].overrideLock, false)
  assert.equal(calls.update[0].req, req)
  assert.equal(calls.update[0].user, req.user)
})

test('bulk publish reports per-document failures and remaining drafts', async () => {
  const { req } = makeRequest({
    user: { id: 1, isAdmin: true },
    counts: [3, 1],
    updateResult: {
      docs: [{ id: 10 }, { id: 11 }],
      errors: [{ id: 12, error: new Error('validation') }],
    },
  })
  const response = await publishEndpoint.handler(req)
  assert.equal(response.status, 200)
  assert.deepEqual(await body(response), {
    draftCountBefore: 3,
    publishedCount: 2,
    failedCount: 1,
    skippedCount: 0,
    remainingDraftCount: 1,
  })
})

test('bulk publish does not write when there are no drafts', async () => {
  const { req, calls } = makeRequest({
    user: { id: 1, isAdmin: true },
    counts: [0],
  })
  const response = await publishEndpoint.handler(req)
  assert.equal(response.status, 200)
  assert.deepEqual(await body(response), {
    draftCountBefore: 0,
    publishedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    remainingDraftCount: 0,
  })
  assert.equal(calls.update.length, 0)
})

test('bulk publish returns a generic error without leaking internal details', async () => {
  const req = {
    user: { id: 1, isAdmin: true },
    payload: {
      count: async () => { throw new Error('database password must not be returned') },
      update: async () => { throw new Error('must not run') },
    },
  }
  const response = await publishEndpoint.handler(req)
  assert.equal(response.status, 500)
  assert.deepEqual(await body(response), { error: 'bulk_publish_failed' })
})
