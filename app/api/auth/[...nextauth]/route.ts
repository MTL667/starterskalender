import NextAuth from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '@/lib/auth-options'

async function setPublicUrl() {
  const hdrs = await headers()
  const forwardedHost = hdrs.get('x-forwarded-host')
  const forwardedProto = hdrs.get('x-forwarded-proto') || 'https'
  const host = forwardedHost || hdrs.get('host')

  if (host && !host.startsWith('localhost')) {
    process.env.NEXTAUTH_URL = `${forwardedProto}://${host}`
  } else if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = process.env.APP_URL || 'https://airport.hertbelgium.be'
  }
}

const handler = NextAuth(authOptions)

async function GET(req: Request, ctx: any) {
  await setPublicUrl()
  return handler(req as any, ctx)
}

async function POST(req: Request, ctx: any) {
  await setPublicUrl()
  return handler(req as any, ctx)
}

export { GET, POST }
