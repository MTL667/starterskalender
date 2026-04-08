import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const trendMonths = parseInt(searchParams.get('trendMonths') || '6')

    const now = new Date()
    const dateFrom = from ? new Date(from) : startOfMonth(now)
    const dateTo = to ? new Date(to) : endOfMonth(now)

    const entities = await prisma.entity.findMany({
      where: { isActive: true },
      select: { id: true, name: true, colorHex: true },
      orderBy: { name: 'asc' },
    })

    const entityMetrics = await Promise.all(
      entities.map(async (entity) => {
        const taskCompletion = await calcTaskCompletion(entity.id, dateFrom, dateTo)
        const leadTime = await calcLeadTime(entity.id, dateFrom, dateTo)
        const materialCoverage = await calcMaterialCoverage(entity.id, dateFrom, dateTo)

        return {
          entityId: entity.id,
          entityName: entity.name,
          entityColor: entity.colorHex,
          taskCompletion,
          leadTime,
          materialCoverage,
        }
      })
    )

    const totals = calcTotals(entityMetrics)

    const trendData = await calcTrends(entities, trendMonths)

    return NextResponse.json({ dateFrom, dateTo, entities: entityMetrics, totals, trends: trendData })
  } catch (error) {
    console.error('Error fetching KPI stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function calcTaskCompletion(entityId: string, from: Date, to: Date) {
  const tasks = await prisma.task.findMany({
    where: {
      entityId,
      dueDate: { not: null, gte: from, lte: to },
    },
    select: { status: true, dueDate: true, completedAt: true },
  })

  let onTime = 0
  let late = 0
  let missed = 0
  const now = new Date()

  for (const task of tasks) {
    if (!task.dueDate) continue
    if (task.status === 'COMPLETED' && task.completedAt) {
      if (task.completedAt <= task.dueDate) {
        onTime++
      } else {
        late++
      }
    } else if (task.dueDate < now) {
      missed++
    }
  }

  const total = onTime + late + missed
  const rate = total > 0 ? Math.round((onTime / total) * 100) : null

  return { onTime, late, missed, total, rate }
}

async function calcLeadTime(entityId: string, from: Date, to: Date) {
  const starters = await prisma.starter.findMany({
    where: {
      entityId,
      type: 'ONBOARDING',
      createdAt: { gte: from, lte: to },
      isCancelled: false,
    },
    select: {
      id: true,
      createdAt: true,
      tasks: {
        select: { status: true, completedAt: true },
      },
    },
  })

  let totalDays = 0
  let completedCount = 0
  let inProgressCount = 0

  for (const starter of starters) {
    if (starter.tasks.length === 0) continue

    const allCompleted = starter.tasks.every(t => t.status === 'COMPLETED')
    if (allCompleted) {
      const completionDates = starter.tasks
        .map(t => t.completedAt)
        .filter((d): d is Date => d !== null)

      if (completionDates.length > 0) {
        const lastCompletion = new Date(Math.max(...completionDates.map(d => d.getTime())))
        const days = Math.round((lastCompletion.getTime() - starter.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        totalDays += days
        completedCount++
      }
    } else {
      inProgressCount++
    }
  }

  const avgDays = completedCount > 0 ? Math.round(totalDays / completedCount) : null

  return { avgDays, completedCount, inProgressCount }
}

async function calcMaterialCoverage(entityId: string, from: Date, to: Date) {
  const starters = await prisma.starter.findMany({
    where: {
      entityId,
      createdAt: { gte: from, lte: to },
      isCancelled: false,
    },
    select: {
      id: true,
      starterMaterials: {
        select: { isProvided: true },
      },
    },
  })

  let totalCoverage = 0
  let fullyCoveredCount = 0
  let startersWithMaterials = 0

  for (const starter of starters) {
    if (starter.starterMaterials.length === 0) continue
    startersWithMaterials++

    const provided = starter.starterMaterials.filter(m => m.isProvided).length
    const total = starter.starterMaterials.length
    const coverage = provided / total

    totalCoverage += coverage
    if (coverage === 1) fullyCoveredCount++
  }

  const avgCoverage = startersWithMaterials > 0 ? Math.round((totalCoverage / startersWithMaterials) * 100) : null

  return { avgCoverage, fullyCoveredCount, totalStarterCount: startersWithMaterials }
}

function calcTotals(entityMetrics: any[]) {
  const tc = entityMetrics.reduce(
    (acc, e) => ({
      onTime: acc.onTime + e.taskCompletion.onTime,
      late: acc.late + e.taskCompletion.late,
      missed: acc.missed + e.taskCompletion.missed,
      total: acc.total + e.taskCompletion.total,
    }),
    { onTime: 0, late: 0, missed: 0, total: 0 }
  )
  const taskCompletionRate = tc.total > 0 ? Math.round((tc.onTime / tc.total) * 100) : null

  const lt = entityMetrics.reduce(
    (acc, e) => ({
      totalDays: acc.totalDays + (e.leadTime.avgDays || 0) * e.leadTime.completedCount,
      completed: acc.completed + e.leadTime.completedCount,
      inProgress: acc.inProgress + e.leadTime.inProgressCount,
    }),
    { totalDays: 0, completed: 0, inProgress: 0 }
  )
  const avgLeadTime = lt.completed > 0 ? Math.round(lt.totalDays / lt.completed) : null

  const mc = entityMetrics.reduce(
    (acc, e) => ({
      totalCoverage: acc.totalCoverage + (e.materialCoverage.avgCoverage || 0) * e.materialCoverage.totalStarterCount,
      totalStarters: acc.totalStarters + e.materialCoverage.totalStarterCount,
      fullyCovered: acc.fullyCovered + e.materialCoverage.fullyCoveredCount,
    }),
    { totalCoverage: 0, totalStarters: 0, fullyCovered: 0 }
  )
  const avgMaterialCoverage = mc.totalStarters > 0 ? Math.round(mc.totalCoverage / mc.totalStarters) : null

  return {
    taskCompletion: { ...tc, rate: taskCompletionRate },
    leadTime: { avgDays: avgLeadTime, completedCount: lt.completed, inProgressCount: lt.inProgress },
    materialCoverage: { avgCoverage: avgMaterialCoverage, fullyCoveredCount: mc.fullyCovered, totalStarterCount: mc.totalStarters },
  }
}

async function calcTrends(entities: { id: string; name: string; colorHex: string }[], months: number) {
  const now = new Date()
  const trends: any[] = []

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i))
    const monthEnd = endOfMonth(subMonths(now, i))
    const label = format(monthStart, 'MMM yyyy')

    const monthData: any = { month: label }

    for (const entity of entities) {
      const tc = await calcTaskCompletion(entity.id, monthStart, monthEnd)
      const lt = await calcLeadTime(entity.id, monthStart, monthEnd)
      const mc = await calcMaterialCoverage(entity.id, monthStart, monthEnd)

      monthData[`${entity.id}_completion`] = tc.rate
      monthData[`${entity.id}_leadTime`] = lt.avgDays
      monthData[`${entity.id}_coverage`] = mc.avgCoverage
    }

    trends.push(monthData)
  }

  return trends
}
