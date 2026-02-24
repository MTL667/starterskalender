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
    const type = searchParams.get('type')

    const today = getTodayInTimezone()

    const visibleEntities = await getVisibleEntities(user)

    const baseWhere: any = {
      year,
      startDate: { lte: today },
    }

    if (!isHRAdmin(user) && !isGlobalViewer(user)) {
      baseWhere.entityId = { in: visibleEntities.map(e => e.id) }
    }

    if (type && ['ONBOARDING', 'OFFBOARDING', 'MIGRATION'].includes(type)) {
      baseWhere.type = type
    }

    const totalYTD = await prisma.starter.count({ where: baseWhere })

    const onboardingCount = await prisma.starter.count({
      where: { ...baseWhere, type: 'ONBOARDING' },
    })
    const offboardingCount = await prisma.starter.count({
      where: { ...baseWhere, type: 'OFFBOARDING' },
    })
    const migrationCount = await prisma.starter.count({
      where: { ...baseWhere, type: 'MIGRATION' },
    })

    const entityStats = await Promise.all(
      visibleEntities.map(async (entity) => {
        const count = await prisma.starter.count({
          where: {
            ...baseWhere,
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
      onboardingCount,
      offboardingCount,
      migrationCount,
      entities: entityStats.filter(e => e.count > 0),
    })
  } catch (error) {
    console.error('Error fetching YTD stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

