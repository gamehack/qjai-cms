import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getPublishedArticles } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'categories', where: { slug: { equals: slug } }, limit: 1, overrideAccess: false,
  })
  const category = result.docs[0]
  if (!category) notFound()
  const articles = await getPublishedArticles(30, category.id)
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">专题栏目</div>
        <h1>{category.name}</h1>
        <p className="hero-lead">{category.description || '精选分析与深度文章'}</p>
      </section>
      <div className="grid">{articles.map(article => (
        <Link className="article-card" href={`/article/${encodeURIComponent(article.slug)}`} key={article.id}>
          <h3>{article.title}</h3><p>{article.summary}</p>
        </Link>
      ))}</div>
      {articles.length === 0 && <p className="empty">暂无已发布文章。</p>}
    </div>
  )
}
