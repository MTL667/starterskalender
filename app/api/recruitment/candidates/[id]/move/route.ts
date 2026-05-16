import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { executeStageMove, MoveValidationError } from '@/lib/recruitment/pipeline-engine'
import { sendStageTransitionEmail, sendRejectionEmail } from '@/lib/recruitment/status-emails'

const moveSchema = z.object({
  toStageId: z.string().min(1),
  sendEmail: z.boolean().optional().default(true),
  rejectionReason: z.string().max(2000).optional().nullable(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('candidate:write')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null },
      include: { vacancy: { select: { id: true, entityId: true } } },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityIds = visibleEntityIds(user, 'candidate:write')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid JSON body', code: 'INVALID_JSON' } },
        { status: 400 }
      )
    }

    const parsed = moveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 422 }
      )
    }

    const result = await executeStageMove({
      candidateId,
      toStageId: parsed.data.toStageId,
      actorId: user.id,
    })

    if (parsed.data.rejectionReason) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: { rejectionReason: parsed.data.rejectionReason },
      }).catch(() => {})
    }

    if (parsed.data.sendEmail) {
      const targetStage = await prisma.vacancyStage.findUnique({
        where: { id: parsed.data.toStageId },
        select: { name: true, isTerminal: true, triggersEmail: true },
      })

      if (targetStage?.triggersEmail) {
        const isRejection = targetStage.name.toLowerCase().includes('reject') ||
          targetStage.name.toLowerCase().includes('afgewezen')

        if (isRejection) {
          sendRejectionEmail(candidateId, candidate.vacancy.id, candidate.vacancy.entityId, parsed.data.rejectionReason ?? undefined)
            .catch(() => {})
        } else {
          sendStageTransitionEmail(candidateId, candidate.vacancy.id, candidate.vacancy.entityId, targetStage.name)
            .catch(() => {})
        }
      }
    }

    return NextResponse.json({ data: result })
  } catch (err: any) {
    if (err instanceof MoveValidationError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400
      return NextResponse.json(
        { error: { message: err.message, code: err.code } },
        { status }
      )
    }

    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }

    console.error('Move candidate error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
