import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import type { VacancyScorecardCriterion } from '@/lib/recruitment/types'

interface EvaluationScore {
  criterionId: string
  score: number
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('recruitment:read')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null },
      select: {
        id: true,
        vacancyId: true,
        vacancy: {
          select: { entityId: true, scorecardCriteria: true },
        },
      },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityScope = visibleEntityIds(user, 'recruitment:read')
    if (entityScope !== 'ALL' && !entityScope.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { candidateId },
      include: {
        evaluator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const criteria = (Array.isArray(candidate.vacancy.scorecardCriteria)
      ? candidate.vacancy.scorecardCriteria
      : []) as unknown as VacancyScorecardCriterion[]

    const criteriaMap = new Map(criteria.map((c) => [c.id, c]))

    const criterionScores: Record<string, { total: number; count: number; reviews: { evaluatorName: string; score: number; comment: string | null }[] }> = {}

    for (const c of criteria) {
      criterionScores[c.id] = { total: 0, count: 0, reviews: [] }
    }

    let totalScoreSum = 0
    let totalScoreCount = 0

    for (const evaluation of evaluations) {
      const scores = (evaluation.scores as unknown as EvaluationScore[]) ?? []
      for (const s of scores) {
        if (criterionScores[s.criterionId]) {
          criterionScores[s.criterionId].total += s.score
          criterionScores[s.criterionId].count += 1
          criterionScores[s.criterionId].reviews.push({
            evaluatorName: evaluation.evaluator.name ?? 'Anonymous',
            score: s.score,
            comment: evaluation.comment,
          })
          totalScoreSum += s.score
          totalScoreCount += 1
        }
      }
    }

    const overallAverage = totalScoreCount > 0 ? totalScoreSum / totalScoreCount : null

    const criteriaBreakdown = criteria.map((c) => {
      const data = criterionScores[c.id]
      return {
        criterionId: c.id,
        name: c.name,
        weight: c.weight,
        average: data.count > 0 ? data.total / data.count : null,
        reviews: data.reviews,
      }
    })

    return NextResponse.json({
      data: {
        evaluations: evaluations.map((e) => ({
          id: e.id,
          evaluatorName: e.evaluator.name ?? 'Anonymous',
          scores: e.scores,
          comment: e.comment,
          createdAt: e.createdAt,
        })),
        aggregate: {
          overallAverage,
          reviewCount: evaluations.length,
          criteria: criteriaBreakdown,
        },
      },
    })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Error fetching evaluations:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
