import NextAuth from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '@/lib/auth-options'

function getPublicUrl(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host')
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https'
  const host = forwardedHost || req.headers.get('host')

  if (host && !host.startsWith('localhost')) {
    return `${forwardedProto}://${host}`
  }

  return process.env.APP_URL || 'https://airport.hertbelgium.be'
}

function handler(req: NextRequest) {
  const publicUrl = getPublicUrl(req)
  process.env.NEXTAUTH_URL = publicUrl

  const nextAuth = NextAuth(authOptions)
  return nextAuth(req as any)
}

export { handler as GET, handler as POST }
