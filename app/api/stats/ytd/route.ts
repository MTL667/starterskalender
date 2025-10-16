import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { getVisibleEntities, isHRAdmin, isGlobalViewer } from '@/lib/rbac'
import { getTodayInTimezone } from '@/lib/week-utils'

// GET - YTD statistics (Year-To-Date tellers)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

    const today = getTodayInTimezone()

    // Haal zichtbare entiteiten op
    const visibleEntities = await getVisibleEntities(user)

    // YTD query: starters waar startDate <= today EN year = gekozen jaar
    const where: any = {
      year,
      startDate: { lte: today },
    }

    // Filter op zichtbare entiteiten als niet admin/global viewer
    if (!isHRAdmin(user) && !isGlobalViewer(user)) {
      where.entityId = { in: visibleEntities.map(e => e.id) }
    }

    // Totaal YTD
    const totalYTD = await prisma.starter.count({ where })

    // YTD per entiteit
    const entityStats = await Promise.all(
      visibleEntities.map(async (entity) => {
        const count = await prisma.starter.count({
          where: {
            ...where,
            entityId: entity.id,
          },
        })

        return {
          entityId: entity.id,
          entityName: entity.name,
          entityColor: entity.colorHex,
          count,
        }
      })
    )

    return NextResponse.json({
      year,
      totalYTD,
      entities: entityStats.filter(e => e.count > 0),
    })
  } catch (error) {
    console.error('Error fetching YTD stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

