import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = { output: 'standalone', poweredByHeader: false, reactStrictMode: true }
export default withPayload(nextConfig)
