import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { getPublicCategories } from '@/lib/content'
import './styles.css'

const siteName = process.env.SITE_NAME || '潜界 AI'
const siteDescription = process.env.SITE_DESCRIPTION || '潜界 AI 追踪 AI 工具、平台新流量、商业模式与市场规则变化，从零散信息中寻找值得验证的早期机会。'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: { default: siteName, template: `%s | ${siteName}` },
  description: siteDescription,
  robots: { index: true, follow: true },
  openGraph: {
    title: siteName,
    siteName,
    description: siteDescription,
    type: 'website',
    locale: 'zh_CN',
  },
  icons: [{ url: '/brand/qianjie-ai-mark.svg', sizes: 'any', type: 'image/svg+xml' }],
}

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const categories = await getPublicCategories()
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="brand" href="/" aria-label="潜界 AI 首页">
              <img className="brand-mark" src="/brand/qianjie-ai-mark.svg" alt="" />
              <span className="brand-text">{siteName}</span>
            </Link>
            <nav className="header-nav" aria-label="主导航">
              {categories.length > 0 && (
                <div className="category-nav" role="group" aria-label="内容分类">
                  {categories.map(category => (
                    <Link href={`/category/${encodeURIComponent(category.slug)}`} key={category.id}>
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}
              <div className={`external-nav${categories.length > 0 ? ' has-categories' : ''}`} role="group" aria-label="站点入口">
                <Link href="https://qjai.org/" target="_blank" rel="noopener noreferrer">主站</Link>
                <Link href="https://tools.qjai.org/" target="_blank" rel="noopener noreferrer">工具</Link>
                <Link href="https://podcast.qjai.org/" target="_blank" rel="noopener noreferrer">播客</Link>
              </div>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-content">
            <p className="footer-copy">© {new Date().getFullYear()} {siteName} · 内容仅供信息分享，具体判断请以原始来源为准。</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
