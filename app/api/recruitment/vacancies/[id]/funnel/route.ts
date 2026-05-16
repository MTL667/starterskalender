import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vacancyId } = await params
    const user = await requirePermission('recruitment:read')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId, deletedAt: null },
      select: { entityId: true },
    })

    if (!vacancy) {
      return NextResponse.json({ error: { message: 'Vacancy not found' } }, { status: 404 })
    }

    const entityIds = visibleEntityIds(user, 'recruitment:read')
    if (entityIds !== 'ALL' && !entityIds.includes(vacancy.entityId)) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeClosed = searchParams.get('includeClosed') === 'true'

    const candidateWhere: any = { vacancyId }
    if (!includeClosed) {
      candidateWhere.deletedAt = null
      candidateWhere.status = 'ACTIVE'
    }

    const stages = await prisma.vacancyStage.findMany({
      where: { vacancyId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        order: true,
        candidates: {
          where: candidateWhere,
          select: { updatedAt: true },
        },
      },
    })

    const funnel = stages.map((stage, index) => {
      const count = stage.candidates.length
      const prevCount = index > 0 ? stages[index - 1].candidates.length : count
      const dropOff = prevCount > 0 && index > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0

      let avgDaysInStage: number | null = null
      if (stage.candidates.length > 0) {
        const now = Date.now()
        const totalDays = stage.candidates.reduce((sum, c) => sum + (now - c.updatedAt.getTime()) / 86400000, 0)
        avgDaysInStage = Math.round(totalDays / stage.candidates.length)
      }

      return {
        id: stage.id,
        name: stage.name,
        order: stage.order,
        count,
        dropOff,
        avgDaysInStage,
      }
    })

    const maxCount = Math.max(...funnel.map(s => s.count), 1)

    return NextResponse.json({
      data: { stages: funnel, maxCount },
    })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: err.message } }, { status })
    }
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
