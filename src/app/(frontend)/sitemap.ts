import type { MetadataRoute } from 'next'
import { getPublishedArticles } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL || 'http://localhost:3000'
  const articles = await getPublishedArticles(1000)
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    ...articles.map(article => ({
      url: `${base}/article/${encodeURIComponent(article.slug)}`,
      lastModified: article.publishedAt ? new Date(article.publishedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
