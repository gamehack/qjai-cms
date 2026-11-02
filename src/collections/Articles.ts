import type { CollectionConfig } from 'payload'
import { isAdminUser, isEditorUser, preventEditorPublication } from '../lib/access'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'source', 'publishedAt', 'updatedAt'],
  },
  access: {
    // Anonymous visitors can only read published content.
    read: ({ req }) => req.user ? true : { status: { equals: 'published' } },
    create: ({ req }) => isEditorUser(req.user) || isAdminUser(req.user),
    update: ({ req }) => isAdminUser(req.user)
      ? true
      : isEditorUser(req.user)
        ? { status: { not_equals: 'published' } }
        : false,
    delete: ({ req }) => isAdminUser(req.user),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        // Editors can prepare drafts and review requests, but cannot publish.
        const safeData = preventEditorPublication(data, req.user)
        // Clear the previous publication timestamp when an administrator
        // unpublishes content; a later publication receives a fresh timestamp.
        if (safeData.status !== undefined && safeData.status !== 'published') {
          return { ...safeData, publishedAt: null }
        }
        if (safeData.status === 'published' && !safeData.publishedAt && !originalDoc?.publishedAt) {
          return { ...safeData, publishedAt: new Date().toISOString() }
        }
        return safeData
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'bodyMarkdown', type: 'textarea', required: true },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'draft',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '待审核', value: 'review' },
        { label: '已发布', value: 'published' },
      ],
      index: true,
    },
    { name: 'publishedAt', type: 'date' },
    { name: 'source', type: 'text', required: true, defaultValue: 'manual' },
    { name: 'sourceKey', type: 'text', unique: true, index: true },
    { name: 'originalUrl', type: 'text' },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'aiGenerated', type: 'checkbox', defaultValue: true },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
  ],
}
