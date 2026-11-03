import Link from 'next/link'
import { getPublicCategories, getPublishedArticles } from '@/lib/content'

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
  const [articles, categories] = await Promise.all([
    getPublishedArticles(),
    getPublicCategories(),
  ])
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">潜界 AI · 编辑部信号</div>
        <h1>机会还没成为共识，先把信号看懂。</h1>
        <p className="hero-lead">潜界 AI 追踪 AI 工具、平台新流量、商业模式与市场规则变化，从零散信息中寻找值得验证的早期机会。</p>
        <p className="brand-slogan">潜伏 AI 世界，享受智能生活。</p>
        <div className="hero-actions">
          <a href="#latest" className="btn">浏览最新情报</a>
          <Link href="https://podcast.qjai.org/" target="_blank" rel="noopener noreferrer" className="btn btn-outline">收听播客</Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="topics" aria-label="内容分类">
          <h2 className="visually-hidden">内容分类</h2>
          <div className="topic-chips">
            {categories.map(category => (
              <Link
                className="topic-chip"
                href={`/category/${encodeURIComponent(category.slug)}`}
                key={category.id}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="latest" id="latest">
        <h2 className="section-title">最新文章</h2>
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

      <section className="about">
        <h2 className="section-title">关于潜界 AI</h2>
        <p>潜界 AI 是面向关注 AI 变化与商业机会的读者的科技媒体与商业情报站。我们不追逐噪音，只把尚未成为共识的早期信号整理为可验证的观察。</p>
        <p>内容方法：以公开信息为基础，区分发布噪音与结构性变化，标注 AI 辅助痕迹，保留原始来源，供读者独立判断与验证。</p>
        <div className="about-links">
          <Link href="https://podcast.qjai.org/" target="_blank" rel="noopener noreferrer" className="btn btn-outline">收听播客节目 →</Link>
        </div>
      </section>
    </div>
  )
}
