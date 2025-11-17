import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/email-logs
 * 
 * Haal email logs op, gegroepeerd per type
 * 
 * Query params:
 * - type: WEEKLY_REMINDER | MONTHLY_SUMMARY | QUARTERLY_SUMMARY | YEARLY_SUMMARY
 * - limit: number (default 5)
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  // Alleen admins kunnen email logs bekijken
  if (!session || session.user.role !== 'HR_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!type) {
      // Geen type opgegeven, haal laatste logs op per type
      const weeklyLogs = await prisma.emailLog.findMany({
        where: { type: 'WEEKLY_REMINDER' },
        orderBy: { sentAt: 'desc' },
        take: limit,
      })

      const monthlyLogs = await prisma.emailLog.findMany({
        where: { type: 'MONTHLY_SUMMARY' },
        orderBy: { sentAt: 'desc' },
        take: limit,
      })

      const quarterlyLogs = await prisma.emailLog.findMany({
        where: { type: 'QUARTERLY_SUMMARY' },
        orderBy: { sentAt: 'desc' },
        take: limit,
      })

      const yearlyLogs = await prisma.emailLog.findMany({
        where: { type: 'YEARLY_SUMMARY' },
        orderBy: { sentAt: 'desc' },
        take: limit,
      })

      return NextResponse.json({
        WEEKLY_REMINDER: weeklyLogs,
        MONTHLY_SUMMARY: monthlyLogs,
        QUARTERLY_SUMMARY: quarterlyLogs,
        YEARLY_SUMMARY: yearlyLogs,
      })
    } else {
      // Specifiek type opgegeven
      const logs = await prisma.emailLog.findMany({
        where: { type: type as any },
        orderBy: { sentAt: 'desc' },
        take: limit,
      })

      return NextResponse.json({ logs })
    }
  } catch (error) {
    console.error('Error fetching email logs:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch email logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

