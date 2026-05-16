import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { candidateCreateSchema } from '@/lib/recruitment/schemas'
import { emitCandidateAdded } from '@/lib/recruitment/pipeline-events'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vacancyId } = await params
    const user = await requirePermission('recruitment:read')

    const entityIds = visibleEntityIds(user, 'recruitment:read')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId, deletedAt: null },
      select: { id: true, entityId: true },
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: { message: 'Vacancy not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (entityIds !== 'ALL' && !entityIds.includes(vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const candidates = await prisma.candidate.findMany({
      where: { vacancyId, deletedAt: null, status: 'ACTIVE' },
      include: {
        stage: { select: { id: true, name: true, order: true } },
        createdBy: { select: { id: true, name: true } },
        evaluations: { select: { scores: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const enriched = candidates.map((c) => {
      const { evaluations, ...rest } = c
      let evaluationAggregateScore: number | null = null
      if (evaluations.length > 0) {
        let sum = 0
        let count = 0
        for (const ev of evaluations) {
          const scores = ev.scores as unknown as { score: number }[]
          if (Array.isArray(scores)) {
            for (const s of scores) {
              sum += s.score
              count += 1
            }
          }
        }
        if (count > 0) evaluationAggregateScore = sum / count
      }
      return { ...rest, evaluationAggregateScore, evaluationReviewCount: evaluations.length }
    })

    return NextResponse.json({ data: enriched })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vacancyId } = await params
    const user = await requirePermission('candidate:write')

    const entityIds = visibleEntityIds(user, 'candidate:write')

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid JSON body', code: 'INVALID_JSON' } },
        { status: 400 }
      )
    }

    const parsed = candidateCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: { fieldErrors: parsed.error.flatten().fieldErrors },
          },
        },
        { status: 422 }
      )
    }

    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId, deletedAt: null },
      select: { id: true, entityId: true },
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: { message: 'Vacancy not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (entityIds !== 'ALL' && !entityIds.includes(vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const firstStage = await prisma.vacancyStage.findFirst({
      where: { vacancyId },
      orderBy: { order: 'asc' },
    })

    if (!firstStage) {
      return NextResponse.json(
        { error: { message: 'Vacancy has no pipeline stages configured', code: 'NO_STAGES' } },
        { status: 422 }
      )
    }

    const { firstName, lastName, email, phone, source, notes } = parsed.data

    const candidate = await prisma.candidate.create({
      data: {
        vacancyId,
        stageId: firstStage.id,
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        source,
        notes: notes?.trim() || null,
        createdById: user.id,
      },
      include: {
        stage: { select: { id: true, name: true, order: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    try {
      emitCandidateAdded(vacancy.entityId, {
        vacancyId,
        candidateId: candidate.id,
        stageId: firstStage.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        addedBy: user.id,
        timestamp: candidate.createdAt.toISOString(),
      })
    } catch { /* SSE emit is non-critical — DB commit already succeeded */ }

    return NextResponse.json({ data: candidate }, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const target = err?.meta?.target
      const isEmailConstraint = Array.isArray(target)
        ? target.includes('email')
        : typeof target === 'string' && target.includes('email')
      if (isEmailConstraint) {
        return NextResponse.json(
          { error: { message: 'Candidate with this email already exists for this vacancy', code: 'DUPLICATE_CANDIDATE' } },
          { status: 409 }
        )
      }
    }

    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }

    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
