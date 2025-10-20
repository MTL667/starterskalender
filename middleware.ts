import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Allow access to welcome page and auth error page
    if (path === '/auth/welcome' || path === '/auth/error') {
      return NextResponse.next()
    }

    // Block users with role = NONE from all protected routes
    if (token?.role === 'NONE') {
      console.log(`🚫 Blocking NONE user from: ${path}`)
      return NextResponse.redirect(new URL('/auth/welcome', req.url))
    }

    // Allow all other authenticated users
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // User must be authenticated (have a token)
        return !!token
      },
    },
  }
)

// Bescherm alle routes behalve publieke auth routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/signin (signin page)
     * - auth/error (error page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/signin|auth/error).*)',
  ],
}
