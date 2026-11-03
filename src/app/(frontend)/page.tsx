import Link from 'next/link'
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

export default async function Home() {
  const articles = await getPublishedArticles()
  return (
    <div className="container">
      <section className="latest" id="latest" aria-label="文章列表">
        {articles.length ? (
          <>
            <Link className="article-card featured" href={`/article/${encodeURIComponent(articles[0].slug)}`} key={articles[0].id}>
              <span className="tag">{sourceLabel(articles[0].source)}</span>
              <h3>{articles[0].title}</h3>
              <p>{articles[0].summary}</p>
              <span className="meta">{dateValue(articles[0].publishedAt)}</span>
            </Link>
            <div className="grid">
              {articles.slice(1).map(article => (
                <Link className="article-card" href={`/article/${encodeURIComponent(article.slug)}`} key={article.id}>
                  <span className="tag">{sourceLabel(article.source)}</span>
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                  <span className="meta">{dateValue(article.publishedAt)}</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="empty">暂无已发布文章。文章通过审核后会显示在这里。</p>
        )}
      </section>

    </div>
  )
}
