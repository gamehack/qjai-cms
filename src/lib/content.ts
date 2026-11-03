import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'

export type PublicArticle = {
  id: string | number
  title: string
  slug: string
  summary: string
  bodyMarkdown: string
  publishedAt?: string | null
  source: string
  originalUrl?: string | null
  aiGenerated?: boolean
  seoTitle?: string | null
  seoDescription?: string | null
}

export async function getPublishedArticles(limit = 24, categoryId?: string | number) {
  const payload = await getPayload({ config })
  const where: Where = { status: { equals: 'published' } }
  if (categoryId !== undefined) where.category = { equals: categoryId }

  const result = await payload.find({
    collection: 'articles', where, sort: '-publishedAt',
    limit, depth: 0, overrideAccess: false,
  })
  return result.docs as unknown as PublicArticle[]
}

export async function getArticleBySlug(slug: string) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'articles',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
    limit: 1, depth: 0, overrideAccess: false,
  })
  return (result.docs[0] || null) as PublicArticle | null
}


export type PublicCategory = {
  id: string | number
  name: string
  slug: string
  description?: string | null
}

export async function getPublicCategories() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'categories',
    sort: 'createdAt',
    limit: 100,
    depth: 0,
    overrideAccess: false,
  })
  return result.docs as unknown as PublicCategory[]
}
