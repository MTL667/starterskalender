import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { locales, type Locale } from '@/i18n/routing'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { locale } = await request.json()

    if (!locales.includes(locale as Locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
    }

    if (session?.user?.email) {
      await prisma.user.update({
        where: { email: session.user.email },
        data: { locale },
      })
    }

    const response = NextResponse.json({ locale })
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Error updating locale:', error)
    return NextResponse.json({ error: 'Failed to update locale' }, { status: 500 })
  }
}
