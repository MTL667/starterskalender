const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '100mb',
    },
  },
  // Next.js 16 default is 10MB — verhogen zodat foto/bestand uploads niet
  // afgekapt worden voordat ze de API route bereiken.
  middlewareClientMaxBodySize: '100mb',
  // Enable standalone output for Docker
  output: 'standalone',
  // Keep heavy packages out of the server bundle
  serverExternalPackages: ['pdf-lib', 'pdfjs-dist'],
  // Environment variables exposed to client
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
}

module.exports = withNextIntl(nextConfig)

