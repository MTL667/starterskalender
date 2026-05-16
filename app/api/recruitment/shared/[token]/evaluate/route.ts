import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { eventBus } from '@/lib/events'
import { evaluateSubmitSchema } from '@/lib/recruitment/schemas'
import type { VacancyScorecardCriterion } from '@/lib/recruitment/types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const user = await requireAuth()

    const share = await prisma.candidateShare.findUnique({
      where: { token },
      include: {
        candidate: {
          include: {
            vacancy: { select: { id: true, entityId: true, scorecardCriteria: true } },
          },
        },
      },
    })

    if (!share) {
      return NextResponse.json(
        { error: { message: 'Share not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (share.sharedWithUserId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    if (share.revokedAt) {
      return NextResponse.json(
        { error: { message: 'Access has been revoked', code: 'REVOKED' } },
        { status: 410 }
      )
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json(
        { error: { message: 'Access has expired', code: 'EXPIRED' } },
        { status: 410 }
      )
    }

    if (share.evaluationSubmittedAt) {
      return NextResponse.json(
        { error: { message: 'Evaluation already submitted', code: 'DUPLICATE_SUBMIT' } },
        { status: 409 }
      )
    }

    const criteria = share.candidate.vacancy.scorecardCriteria as unknown as VacancyScorecardCriterion[]
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json(
        { error: { message: 'No scorecard criteria configured for this vacancy', code: 'NO_SCORECARD' } },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = evaluateSubmitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    const criteriaIds = new Set(criteria.map((c) => c.id))
    const submittedIds = new Set(parsed.data.scores.map((s) => s.criterionId))

    if (submittedIds.size !== parsed.data.scores.length) {
      return NextResponse.json(
        { error: { message: 'Duplicate criterion scores', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    for (const id of submittedIds) {
      if (!criteriaIds.has(id)) {
        return NextResponse.json(
          { error: { message: `Unknown criterion: ${id}`, code: 'VALIDATION_ERROR' } },
          { status: 400 }
        )
      }
    }

    if (submittedIds.size !== criteriaIds.size) {
      return NextResponse.json(
        { error: { message: 'All criteria must be rated', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const [evaluation] = await prisma.$transaction([
      prisma.evaluation.create({
        data: {
          candidateId: share.candidateId,
          shareId: share.id,
          vacancyId: share.candidate.vacancy.id,
          evaluatorId: user.id,
          scores: parsed.data.scores,
          comment: parsed.data.comment ?? null,
        },
      }),
      prisma.candidateShare.update({
        where: { id: share.id },
        data: { evaluationSubmittedAt: new Date() },
      }),
    ])

    await createAuditLog({
      actorId: user.id,
      action: 'CANDIDATE_EVALUATED',
      target: share.candidateId,
      meta: {
        shareId: share.id,
        evaluationId: evaluation.id,
        vacancyId: share.candidate.vacancy.id,
        criteriaCount: parsed.data.scores.length,
      },
    })

    eventBus.emit({
      type: 'recruitment:share:evaluated',
      entityId: share.candidate.vacancy.entityId,
      payload: {
        shareId: share.id,
        candidateId: share.candidateId,
        vacancyId: share.candidate.vacancy.id,
        evaluatorId: user.id,
      },
    })

    try {
      await prisma.notification.create({
        data: {
          userId: share.createdById,
          type: 'RECRUITMENT_EVALUATION_SUBMITTED',
          title: 'Evaluatie ontvangen',
          message: `${user.name ?? 'Een reviewer'} heeft een evaluatie ingestuurd voor ${share.candidate.firstName} ${share.candidate.lastName}.`,
          linkUrl: `/recruitment/vacatures/${share.candidate.vacancy.id}`,
        },
      })
      eventBus.emit({
        type: 'notification:new',
        entityId: '*',
        payload: { userId: share.createdById },
      })
    } catch { /* notification is non-critical */ }

    return NextResponse.json({ data: { id: evaluation.id, submitted: true } }, { status: 201 })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: { message: 'Evaluation already submitted', code: 'DUPLICATE_SUBMIT' } },
        { status: 409 }
      )
    }
    console.error('Evaluation submit error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
