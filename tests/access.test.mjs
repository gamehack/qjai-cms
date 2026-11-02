import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignInitialAdministrator,
  isAdminUser,
  isEditorUser,
  preventEditorPublication,
  preventNonAdminPromotion,
  preserveLastAdministrator,
} from '../src/lib/access.ts'

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

test('only the first account is automatically promoted to administrator', () => {
  assert.equal(assignInitialAdministrator({ isAdmin: false }, 0).isAdmin, true)
  assert.equal(assignInitialAdministrator({ isAdmin: true }, 1).isAdmin, true)
  assert.equal(assignInitialAdministrator({ isAdmin: false }, 3).isAdmin, false)
})

test('non-admin users cannot promote themselves through crafted data', () => {
  assert.equal(preventNonAdminPromotion({ isAdmin: true }, { id: 2, isAdmin: false }).isAdmin, false)
  assert.equal(preventNonAdminPromotion({ isAdmin: true }, null).isAdmin, false)
  assert.equal(preventNonAdminPromotion({ isAdmin: false }, { id: 1, isAdmin: true }).isAdmin, false)
})

test('the last administrator cannot demote themselves', () => {
  const admin = { id: 1, isAdmin: true }
  assert.equal(preserveLastAdministrator({ isAdmin: false }, admin, true).isAdmin, true)
  assert.equal(preserveLastAdministrator({ isAdmin: false }, admin, false).isAdmin, false)
})

test('editors cannot publish articles directly', () => {
  const editor = { id: 2, isAdmin: false }
  const published = preventEditorPublication(
    { status: 'published', publishedAt: '2026-11-02T00:00:00.000Z' },
    editor,
  )
  assert.equal(published.status, 'review')
  assert.equal(published.publishedAt, null)
  assert.equal(preventEditorPublication({ status: 'draft' }, editor).status, 'draft')
  assert.equal(preventEditorPublication({ status: 'published' }, { id: 1, isAdmin: true }).status, 'published')
})
