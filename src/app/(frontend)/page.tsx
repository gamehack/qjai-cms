import Link from 'next/link'
import { getPublishedArticles } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const articles = await getPublishedArticles()
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">WRITE · REVIEW · PUBLISH</div>
        <h1>让内容，清晰呈现。</h1>
        <p className="hero-lead">一个简洁、可自托管的内容发布空间。通过统一的编辑流程管理文章，并在审核通过后公开发布。</p>
      </section>
      <section>
        <h2 className="section-title">最新文章</h2>
        {articles.length ? <div className="grid">{articles.map(article => (
          <Link className="article-card" href={`/article/${encodeURIComponent(article.slug)}`} key={article.id}>
            <span className="tag">{article.source || '文章'}</span>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
            <span className="meta">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('zh-CN') : ''}</span>
          </Link>
        ))}</div> : <p className="empty">暂无已发布文章。文章通过审核后会显示在这里。</p>}
      </section>
    </div>
  )
}
