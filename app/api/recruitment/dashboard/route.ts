import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('recruitment:read')
    const entityIds = visibleEntityIds(user, 'recruitment:read')
    const { searchParams } = new URL(request.url)
    const filterEntityId = searchParams.get('entityId')

    const entityFilter: any = entityIds === 'ALL' ? {} : { id: { in: entityIds } }
    if (filterEntityId) {
      if (entityIds !== 'ALL' && !entityIds.includes(filterEntityId)) {
        return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
      }
      entityFilter.id = filterEntityId
    }

    const vacancyWhere = {
      deletedAt: null,
      entity: entityFilter.id ? { id: entityFilter.id } : entityFilter,
    }

    const [activeVacancies, totalCandidates, candidatesByEntity, hiredCandidates] = await Promise.all([
      prisma.vacancy.count({
        where: { ...vacancyWhere, status: 'PUBLISHED' },
      }),
      prisma.candidate.count({
        where: { deletedAt: null, status: 'ACTIVE', vacancy: vacancyWhere },
      }),
      prisma.vacancy.findMany({
        where: vacancyWhere,
        select: {
          entity: { select: { id: true, name: true, colorHex: true } },
          _count: { select: { candidates: { where: { deletedAt: null, status: 'ACTIVE' } } } },
        },
      }),
      prisma.candidate.findMany({
        where: {
          deletedAt: null,
          starterId: { not: null },
          vacancy: vacancyWhere,
          createdAt: { gte: new Date(Date.now() - 180 * 86400000) },
        },
        select: { createdAt: true, updatedAt: true },
      }),
    ])

    const entityBreakdown: Record<string, { name: string; colorHex: string; candidates: number; vacancies: number }> = {}
    for (const v of candidatesByEntity) {
      const eid = v.entity.id
      if (!entityBreakdown[eid]) {
        entityBreakdown[eid] = { name: v.entity.name, colorHex: v.entity.colorHex, candidates: 0, vacancies: 0 }
      }
      entityBreakdown[eid].candidates += v._count.candidates
      entityBreakdown[eid].vacancies += 1
    }

    let avgTimeToHire: number | null = null
    if (hiredCandidates.length > 0) {
      const totalDays = hiredCandidates.reduce((sum, c) => {
        const days = (c.updatedAt.getTime() - c.createdAt.getTime()) / 86400000
        return sum + days
      }, 0)
      avgTimeToHire = Math.round(totalDays / hiredCandidates.length)
    }

    return NextResponse.json({
      data: {
        activeVacancies,
        totalCandidates,
        avgTimeToHire,
        hiredLast6Months: hiredCandidates.length,
        byEntity: Object.values(entityBreakdown),
      },
    })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: err.message } }, { status })
    }
    console.error('Dashboard error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
