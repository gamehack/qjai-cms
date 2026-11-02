import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import './styles.css'

const siteName = process.env.SITE_NAME || 'My Publication'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: { default: siteName, template: `%s | ${siteName}` },
  description: process.env.SITE_DESCRIPTION || 'A publication powered by qjai-cms.',
  robots: { index: true, follow: true },
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="brand" href="/"><span className="brand-symbol">Q</span> {siteName}</Link>
            <nav aria-label="主导航">
              <Link href="/">首页</Link>
              <Link href="/admin">管理后台</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-content">
            <p>内容，值得被认真呈现。</p>
            <p>© {new Date().getFullYear()} {siteName} · Powered by qjai-cms.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
