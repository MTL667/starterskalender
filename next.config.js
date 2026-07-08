const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'airport.hertbelgium.be', 'starterskalender.kevinit.be'],
      bodySizeLimit: '100mb',
    },
    // Next.js 16 default is 10MB — verhogen zodat foto/bestand uploads niet
    // afgekapt worden voordat ze de API route bereiken. Hoort onder
    // `experimental` en heet `proxyClientMaxBodySize` (hernoemd van
    // middlewareClientMaxBodySize samen met de middleware→proxy migratie).
    proxyClientMaxBodySize: '100mb',
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Keep heavy packages out of the server bundle
  serverExternalPackages: ['pdf-lib', 'pdfjs-dist'],
  // Environment variables exposed to client
  env: {
    APP_URL: process.env.APP_URL,
    DEV_MODE: process.env.DEV_MODE,
  },
}

module.exports = withNextIntl(nextConfig)

