import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { getArticleBySlug } from '@/lib/content'

export const dynamic = 'force-dynamic'
type Args = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const article = await getArticleBySlug((await params).slug)
  if (!article) return { title: '文章未找到', robots: { index: false } }
  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.summary,
    alternates: { canonical: `/article/${encodeURIComponent(article.slug)}` },
  }
}

export default async function ArticlePage({ params }: Args) {
  const article = await getArticleBySlug((await params).slug)
  if (!article) notFound()
  return (
    <article className="article-main">
      <div className="eyebrow">文章</div>
      <h1>{article.title}</h1>
      <p className="article-lead">{article.summary}</p>
      <p className="meta">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('zh-CN') : ''}{article.aiGenerated ? ' · 包含 AI 辅助生成内容' : ''}</p>
      <div className="content"><ReactMarkdown skipHtml>{article.bodyMarkdown}</ReactMarkdown></div>
      {article.originalUrl?.startsWith('https://') && (
        <p className="meta">参考来源：<a href={article.originalUrl} rel="nofollow noopener noreferrer" target="_blank">查看原始资料</a></p>
      )}
    </article>
  )
}
