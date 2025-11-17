import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/cron-preview
 * 
 * Preview: Toon welke ontvangers emails zouden krijgen zonder daadwerkelijk te verzenden
 * 
 * Body: { endpoint: string }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'HR_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { endpoint } = await req.json()

    // Bepaal notification type op basis van endpoint
    let notificationType: 'weeklyReminder' | 'monthlySummary' | 'quarterlySummary' | 'yearlySummary'
    let cronType: string
    let dateRange: { start: Date; end: Date }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (endpoint.includes('weekly')) {
      notificationType = 'weeklyReminder'
      cronType = 'WEEKLY_REMINDER'
      // 7 dagen in de toekomst
      const inSevenDays = new Date(today)
      inSevenDays.setDate(inSevenDays.getDate() + 7)
      const inEightDays = new Date(today)
      inEightDays.setDate(inEightDays.getDate() + 8)
      dateRange = { start: inSevenDays, end: inEightDays }
    } else if (endpoint.includes('monthly')) {
      notificationType = 'monthlySummary'
      cronType = 'MONTHLY_SUMMARY'
      // Vorige maand
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      lastDayLastMonth.setHours(23, 59, 59, 999)
      dateRange = { start: firstDayLastMonth, end: lastDayLastMonth }
    } else if (endpoint.includes('quarterly')) {
      notificationType = 'quarterlySummary'
      cronType = 'QUARTERLY_SUMMARY'
      // Vorig kwartaal
      const currentMonth = today.getMonth() + 1
      let quarter: number
      let year = today.getFullYear()
      if (currentMonth <= 3) {
        quarter = 4
        year = year - 1
      } else if (currentMonth <= 6) {
        quarter = 1
      } else if (currentMonth <= 9) {
        quarter = 2
      } else {
        quarter = 3
      }
      const quarterStartMonth = (quarter - 1) * 3
      const firstDayQuarter = new Date(year, quarterStartMonth, 1)
      const lastDayQuarter = new Date(year, quarterStartMonth + 3, 0)
      lastDayQuarter.setHours(23, 59, 59, 999)
      dateRange = { start: firstDayQuarter, end: lastDayQuarter }
    } else if (endpoint.includes('yearly')) {
      notificationType = 'yearlySummary'
      cronType = 'YEARLY_SUMMARY'
      // Vorig jaar
      const year = today.getFullYear() - 1
      const firstDayYear = new Date(year, 0, 1)
      const lastDayYear = new Date(year, 11, 31, 23, 59, 59, 999)
      dateRange = { start: firstDayYear, end: lastDayYear }
    } else {
      return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 })
    }

    // Haal starters op voor deze periode
    const starters = await prisma.starter.findMany({
      where: {
        startDate: {
          gte: dateRange.start,
          lt: dateRange.end,
        },
        isCancelled: false,
        entityId: {
          not: null,
        },
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Haal alle users op die deze notificatie enabled hebben
    const allUsers = await prisma.user.findMany({
      where: {
        notificationPreferences: {
          some: {
            [notificationType]: true,
          },
        },
      },
      include: {
        notificationPreferences: {
          where: {
            [notificationType]: true,
          },
          include: {
            entity: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        memberships: {
          include: {
            entity: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Bereken voor elke user welke starters ze zouden zien
    const recipients: Array<{
      email: string
      name: string | null
      startersCount: number
      entities: string[]
    }> = []

    for (const user of allUsers) {
      let accessibleEntityIds: string[]
      
      if (user.role === 'HR_ADMIN') {
        accessibleEntityIds = user.notificationPreferences.map(p => p.entityId)
      } else {
        const preferencesMap = new Set(user.notificationPreferences.map(p => p.entityId))
        accessibleEntityIds = user.memberships
          .filter(m => preferencesMap.has(m.entityId))
          .map(m => m.entityId)
      }

      if (accessibleEntityIds.length === 0) {
        continue
      }

      const userStarters = starters.filter(s => 
        s.entityId && accessibleEntityIds.includes(s.entityId)
      )

      if (userStarters.length === 0) {
        continue
      }

      // Groepeer per entiteit
      const entitiesSet = new Set<string>()
      userStarters.forEach(s => {
        if (s.entity) {
          entitiesSet.add(s.entity.name)
        }
      })

      recipients.push({
        email: user.email,
        name: user.name,
        startersCount: userStarters.length,
        entities: Array.from(entitiesSet),
      })
    }

    return NextResponse.json({
      cronType,
      totalStarters: starters.length,
      recipients,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error previewing cron recipients:', error)
    return NextResponse.json(
      {
        error: 'Failed to preview recipients',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

