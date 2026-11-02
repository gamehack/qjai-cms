import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const url = process.env.SITE_URL || 'http://localhost:3000'
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] }],
    sitemap: `${url}/sitemap.xml`,
  }
}
