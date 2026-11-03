import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { getArticleBySlug } from '@/lib/content'

export const dynamic = 'force-dynamic'
type Args = { params: Promise<{ slug: string }> }

function dateValue(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
}

function sourceLabel(value: string | undefined) {
  const map: Record<string, string> = {
    producthunt: 'Product Hunt',
    'product hunt': 'Product Hunt',
    product_hunt: 'Product Hunt',
    trustmrr: 'TrustMRR',
    x: 'X',
    twitter: 'X',
    manual: '原创观察',
  }
  if (!value) return '文章'
  return map[value.toLowerCase()] ?? value
}

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
  const publishedAt = dateValue(article.publishedAt)
  return (
    <article className="article-page">
      <nav className="breadcrumbs" aria-label="面包屑">
        <Link href="/">首页</Link>
        <span aria-hidden="true">&rsaquo;</span>
        <span>文章</span>
      </nav>
      <div className="article-header">
        <div className="eyebrow">文章</div>
        <h1>{article.title}</h1>
        <p className="article-lead">{article.summary}</p>
        <p className="meta">
          <span className="tag">{sourceLabel(article.source)}</span>{publishedAt ? ` · ${publishedAt}` : ''}{article.aiGenerated ? ' · 包含 AI 辅助生成内容' : ''}
        </p>
      </div>
      <div className="content"><ReactMarkdown skipHtml>{article.bodyMarkdown}</ReactMarkdown></div>
      {article.originalUrl?.startsWith('https://') && (
        <div className="source-note">
          参考来源：<a href={article.originalUrl} rel="nofollow noopener noreferrer" target="_blank">查看原始资料</a>
        </div>
      )}
      <div className="article-footer">
        <Link href="/" className="btn">← 返回文章列表</Link>
      </div>
    </article>
  )
}
