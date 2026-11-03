import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
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

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="brand" href="/" aria-label="潜界 AI 首页">
              <img className="brand-mark" src="/brand/qianjie-ai-mark.svg" alt="" />
              <span className="brand-text">{siteName}</span>
            </Link>
            <nav aria-label="主导航">
              <Link href="/">首页</Link>
              <Link href="https://podcast.qjai.org/" target="_blank" rel="noopener noreferrer">播客</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-content">
            <div className="footer-brand">
              <img className="brand-mark" src="/brand/qianjie-ai-mark.svg" alt="" />
              <span className="brand-text">{siteName}</span>
              <p className="footer-tagline">潜伏 AI 世界，享受智能生活。</p>
            </div>
            <nav className="footer-nav" aria-label="尾部导航">
              <Link href="https://podcast.qjai.org/" target="_blank" rel="noopener noreferrer" className="footer-link">播客节目</Link>
            </nav>
            <p className="footer-copy">© {new Date().getFullYear()} {siteName} · 内容仅供信息分享，具体判断请以原始来源为准。</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
