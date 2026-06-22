import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('starters:read:leavereason')

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 })
    }
    const period = searchParams.get('period') || 'year'
    if (!['year', 'quarter', 'month'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 })
    }
    const quarterParam = searchParams.get('quarter')
    const quarter = quarterParam ? parseInt(quarterParam, 10) : null
    const monthParam = searchParams.get('month')
    const month = monthParam ? parseInt(monthParam, 10) : null

    const baseWhere: Prisma.StarterWhereInput = {
      type: 'OFFBOARDING',
      isCancelled: false,
      year,
    }

    if (period === 'quarter' && quarter && quarter >= 1 && quarter <= 4) {
      const startMonth = (quarter - 1) * 3 + 1
      baseWhere.startDate = {
        gte: new Date(year, startMonth - 1, 1),
        lt: new Date(year, startMonth + 2, 1),
      }
    } else if (period === 'month' && month && month >= 1 && month <= 12) {
      baseWhere.startDate = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      }
    }

    const [byInitiator, byReason, total, trend] = await Promise.all([
      prisma.starter.groupBy({
        by: ['terminationInitiator'],
        where: baseWhere,
        _count: { id: true },
      }),

      prisma.starter.groupBy({
        by: ['leaveReasonId'],
        where: { ...baseWhere, leaveReasonId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 15,
      }),

      prisma.starter.count({ where: baseWhere }),

      prisma.$queryRaw`
        SELECT EXTRACT(MONTH FROM "startDate")::int AS period,
               COUNT(*)::int AS count,
               "terminationInitiator" AS initiator
        FROM "Starter"
        WHERE type = 'OFFBOARDING' AND "isCancelled" = false
          AND "year" = ${year} AND "startDate" IS NOT NULL
        GROUP BY period, initiator
        ORDER BY period
      `,
    ])

    const reasonIds = byReason
      .map((r) => r.leaveReasonId)
      .filter((id): id is string => id !== null)

    const reasons = reasonIds.length > 0
      ? await prisma.leaveReason.findMany({
          where: { id: { in: reasonIds } },
          select: { id: true, name: true },
        })
      : []

    const reasonMap = new Map(reasons.map((r) => [r.id, r.name]))

    const byReasonResolved = byReason.map((r) => ({
      reasonId: r.leaveReasonId,
      reasonName: reasonMap.get(r.leaveReasonId!) || 'Onbekend',
      count: r._count.id,
    }))

    const byInitiatorResolved = byInitiator.map((r) => ({
      initiator: r.terminationInitiator || 'NOT_SET',
      count: r._count.id,
    }))

    return NextResponse.json({
      year,
      period,
      total,
      byInitiator: byInitiatorResolved,
      byReason: byReasonResolved,
      trend,
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Error fetching offboarding stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
