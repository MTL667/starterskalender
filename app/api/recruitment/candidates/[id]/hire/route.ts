import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { executeStageMove, MoveValidationError } from '@/lib/recruitment/pipeline-engine'
import { createAuditLog } from '@/lib/audit'

const hireSchema = z.object({
  toStageId: z.string().min(1),
  startDate: z.string().optional(),
  contractType: z.string().max(100).optional(),
  roleTitle: z.string().max(200).optional(),
  sendEmail: z.boolean().optional().default(true),
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
      include: {
        vacancy: {
          select: {
            id: true,
            entityId: true,
            title: true,
          },
        },
      },
    })

    if (!candidate) {
      return NextResponse.json({ error: { message: 'Candidate not found' } }, { status: 404 })
    }

    const entityIds = visibleEntityIds(user, 'candidate:write')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
    }

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 })
    }

    const parsed = hireSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: { message: 'Validation failed', details: parsed.error.flatten() } }, { status: 422 })
    }

    const starter = await prisma.$transaction(async (tx) => {
      const s = await tx.starter.create({
        data: {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          phoneNumber: candidate.phone,
          entityId: candidate.vacancy.entityId,
          roleTitle: parsed.data.roleTitle || candidate.vacancy.title,
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
          via: 'Recruitment',
          notes: parsed.data.contractType ? `Contract: ${parsed.data.contractType}` : undefined,
          createdBy: user.id,
          isPendingBoarding: !parsed.data.startDate,
        },
      })

      await tx.candidate.update({
        where: { id: candidateId },
        data: { starterId: s.id },
      })

      return s
    })

    let moveResult: any
    try {
      moveResult = await executeStageMove({
        candidateId,
        toStageId: parsed.data.toStageId,
        actorId: user.id,
      })
    } catch (moveErr) {
      await prisma.$transaction(async (tx) => {
        await tx.candidate.update({ where: { id: candidateId }, data: { starterId: null } })
        await tx.starter.delete({ where: { id: starter.id } })
      })
      throw moveErr
    }

    await createAuditLog({
      actorId: user.id,
      action: 'CANDIDATE_STAGE_MOVE',
      target: candidateId,
      meta: {
        toStageId: parsed.data.toStageId,
        hired: true,
        starterId: starter.id,
      },
    })

    return NextResponse.json({
      data: {
        ...moveResult,
        starterId: starter.id,
        starterName: `${starter.firstName} ${starter.lastName}`,
      },
    })
  } catch (err: any) {
    if (err instanceof MoveValidationError) {
      return NextResponse.json({ error: { message: err.message, code: err.code } }, { status: 400 })
    }
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: err.message } }, { status })
    }
    console.error('Hire candidate error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
