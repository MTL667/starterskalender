import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (path === '/auth/welcome' || path === '/auth/error') {
      return NextResponse.next()
    }

    if (token?.role === 'NONE') {
      console.log(`🚫 Blocking NONE user from: ${path}`)
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
