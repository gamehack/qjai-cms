import assert from 'node:assert/strict'
import test from 'node:test'
import { isAdminUser, isEditorUser } from '../src/lib/access.ts'

test('administrator flag is strict and never inferred from an authenticated user', () => {
  assert.equal(isAdminUser({ id: 1, isAdmin: true }), true)
  assert.equal(isAdminUser({ id: 2, isAdmin: false }), false)
  assert.equal(isAdminUser({ id: 3 }), false)
  assert.equal(isAdminUser(null), false)
  assert.equal(isAdminUser(undefined), false)
})

test('authenticated non-admin accounts are editors', () => {
  assert.equal(isEditorUser({ id: 2, isAdmin: false }), true)
  assert.equal(isEditorUser({ id: 3 }), true)
  assert.equal(isEditorUser(null), false)
  assert.equal(isEditorUser(undefined), false)
  assert.equal(isEditorUser({ id: 1, isAdmin: true }), false)
})
