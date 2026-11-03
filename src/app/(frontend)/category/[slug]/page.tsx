import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getPublishedArticles } from '@/lib/content'

export const dynamic = 'force-dynamic'

function dateValue(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
}

function sourceLabel(value: string | null | undefined) {
  const map: Record<string, string> = {
    producthunt: 'Product Hunt',
    'product hunt': 'Product Hunt',
    product_hunt: 'Product Hunt',
    trustmrr: 'TrustMRR',
    x: 'X',
    twitter: 'X',
    manual: '原创观察',
  }
  return value ? map[value.toLowerCase()] ?? value : '文章'
}

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
      <nav className="breadcrumbs" aria-label="面包屑">
        <Link href="/">首页</Link>
        <span aria-hidden="true">&rsaquo;</span>
        <span>{category.name}</span>
      </nav>
      <section className="hero category-hero">
        <div className="eyebrow">专题栏目</div>
        <h1>{category.name}</h1>
        <p className="hero-lead">{category.description || '精选分析与深度文章'}</p>
      </section>
      {articles.length ? (
        <div className="grid">{articles.map(article => (
          <Link className="article-card" href={`/article/${encodeURIComponent(article.slug)}`} key={article.id}>
            <span className="tag">{sourceLabel(article.source)}</span>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
            <span className="meta">{dateValue(article.publishedAt)}</span>
          </Link>
        ))}</div>
      ) : (
        <div className="empty-state">
          <p className="empty">暂无已发布文章。</p>
          <Link href="/" className="btn">返回首页</Link>
        </div>
      )}
    </div>
  )
}
