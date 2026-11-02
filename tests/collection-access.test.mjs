import assert from 'node:assert/strict'
import test from 'node:test'
import { Articles } from '../src/collections/Articles.ts'
import { Categories } from '../src/collections/Categories.ts'
import { PublishingRecords } from '../src/collections/PublishingRecords.ts'
import { Users } from '../src/collections/Users.ts'

const permissions = (collection, operation, user) =>
  collection.access[operation]({ req: { user } })

test('first account is promoted to administrator and later public escalation is denied', async () => {
  const hook = Users.hooks.beforeChange[0]
  const first = await hook({
    data: { email: 'owner@example.invalid', isAdmin: false },
    operation: 'create',
    req: { user: null, payload: { count: async () => ({ totalDocs: 0 }) } },
  })
  assert.equal(first.isAdmin, true)

  const later = await hook({
    data: { email: 'attacker@example.invalid', isAdmin: true },
    operation: 'create',
    req: { user: null, payload: { count: async () => ({ totalDocs: 1 }) } },
  })
  assert.equal(later.isAdmin, false)
})

test('administrators can manage users while editors cannot', () => {
  const admin = { id: 1, isAdmin: true }
  const editor = { id: 2, isAdmin: false }
  assert.equal(permissions(Users, 'admin', admin), true)
  assert.equal(permissions(Users, 'create', editor), false)
  assert.equal(permissions(Users, 'read', editor), false)
  assert.equal(permissions(Users, 'delete', editor), false)
})

test('editors cannot publish, edit published articles, or delete articles', () => {
  const admin = { id: 1, isAdmin: true }
  const editor = { id: 2, isAdmin: false }
  const updateAccess = permissions(Articles, 'update', editor)
  assert.deepEqual(updateAccess, { status: { not_equals: 'published' } })
  assert.equal(permissions(Articles, 'delete', editor), false)
  assert.equal(permissions(Articles, 'delete', admin), true)

  const hook = Articles.hooks.beforeChange[0]
  const result = hook({
    data: { status: 'published', publishedAt: '2026-11-02T00:00:00.000Z' },
    req: { user: editor },
  })
  assert.equal(result.status, 'review')
  assert.equal(result.publishedAt, null)
})

test('editors can manage categories but cannot access publication audit records', () => {
  const editor = { id: 2, isAdmin: false }
  assert.equal(permissions(Categories, 'create', editor), true)
  assert.equal(permissions(Categories, 'update', editor), true)
  assert.equal(permissions(Categories, 'delete', editor), false)
  assert.equal(permissions(PublishingRecords, 'read', editor), false)
  assert.equal(permissions(PublishingRecords, 'create', editor), false)
})

test('the only administrator cannot demote or delete themselves', async () => {
  const admin = { id: 1, isAdmin: true }
  const hook = Users.hooks.beforeChange[0]
  const updated = await hook({
    id: 1,
    data: { isAdmin: false },
    operation: 'update',
    req: {
      user: admin,
      payload: {
        count: async () => ({ totalDocs: 1 }),
      },
    },
  })
  assert.equal(updated.isAdmin, true)

  const canDelete = await Users.access.delete({
    id: 1,
    req: {
      user: admin,
      payload: {
        count: async () => ({ totalDocs: 1 }),
      },
    },
  })
  assert.equal(canDelete, false)
})
