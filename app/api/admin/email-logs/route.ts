import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user || !isHRAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!type) {
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
