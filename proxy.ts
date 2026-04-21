import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (path === '/auth/welcome' || path === '/auth/error') {
      return NextResponse.next()
    }

    // Blokkeer alleen als er GEEN toegang is via legacyRole EN geen RBAC v2
    // roleAssignments (zichtbaar als token.perms, gevuld in jwt callback).
    const perms = ((token as any)?.perms as string[] | undefined) ?? []
    const hasLegacyAccess = token?.role && token.role !== 'NONE'
    const hasRbacV2Access = perms.length > 0
    if (!hasLegacyAccess && !hasRbacV2Access) {
      console.log(`🚫 Blocking guest user (no role) from: ${path}`)
      return NextResponse.redirect(new URL('/auth/welcome', req.url))
    }

    const response = NextResponse.next()

    const localeCookie = req.cookies.get('NEXT_LOCALE')?.value
    const userLocale = token?.locale as string | undefined
    if (!localeCookie && userLocale) {
      response.cookies.set('NEXT_LOCALE', userLocale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!api/auth|api/cron|api/health|api/system|api/uploads|api/sign|api/webhooks|sign|_next/static|_next/image|favicon.ico|auth/signin|auth/error|demo-).*)',
  ],
}
