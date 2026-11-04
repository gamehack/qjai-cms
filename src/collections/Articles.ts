import type { CollectionConfig, PayloadRequest } from 'payload'
import { isAdminUser, isEditorUser, preventEditorPublication } from '../lib/access'

async function countDraftArticles(req: PayloadRequest): Promise<number> {
  const result = await req.payload.count({
    collection: 'articles',
    where: { status: { equals: 'draft' } },
    overrideAccess: false,
    req,
    user: req.user,
  })
  return result.totalDocs
}

function forbiddenResponse() {
  return Response.json(
    { error: 'forbidden' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  )
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'source', 'publishedAt', 'updatedAt'],
    components: {
      beforeList: ['/components/payload/PublishAllDraftsButton#PublishAllDraftsButton'],
    },
  },
  endpoints: [
    {
      path: '/publish-all',
      method: 'get',
      handler: async (req) => {
        if (!isAdminUser(req.user)) return forbiddenResponse()

        try {
          const draftCount = await countDraftArticles(req)
          return Response.json(
            { draftCount },
            { headers: { 'Cache-Control': 'no-store' } },
          )
        } catch {
          return Response.json(
            { error: 'draft_count_failed' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } },
          )
        }
      },
    },
    {
      path: '/publish-all',
      method: 'post',
      handler: async (req) => {
        if (!isAdminUser(req.user)) return forbiddenResponse()

        try {
          const draftCountBefore = await countDraftArticles(req)
          if (draftCountBefore === 0) {
            return Response.json(
              {
                draftCountBefore: 0,
                publishedCount: 0,
                failedCount: 0,
                skippedCount: 0,
                remainingDraftCount: 0,
              },
              { headers: { 'Cache-Control': 'no-store' } },
            )
          }

          // The status filter is repeated in the write query. A document that
          // an administrator moves to review after the preview cannot be
          // accidentally published by this bulk operation.
          const result = await req.payload.update({
            collection: 'articles',
            where: { status: { equals: 'draft' } },
            data: { status: 'published' },
            depth: 0,
            overrideAccess: false,
            overrideLock: false,
            req,
            user: req.user,
          })

          const publishedCount = result.docs.length
          const failedCount = result.errors.length
          const remainingDraftCount = await countDraftArticles(req)
          const skippedCount = Math.max(
            0,
            draftCountBefore - publishedCount - failedCount,
          )

          return Response.json(
            {
              draftCountBefore,
              publishedCount,
              failedCount,
              skippedCount,
              remainingDraftCount,
            },
            { headers: { 'Cache-Control': 'no-store' } },
          )
        } catch {
          // A failed response is intentionally not retried by the client.
          // The administrator can refresh the list and inspect remaining drafts.
          return Response.json(
            { error: 'bulk_publish_failed' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } },
          )
        }
      },
    },
  ],
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
