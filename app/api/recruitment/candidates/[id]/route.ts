import { NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('recruitment:read')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null, status: 'ACTIVE' },
      include: {
        vacancy: {
          select: {
            id: true,
            title: true,
            entityId: true,
            entity: { select: { id: true, name: true, colorHex: true } },
          },
        },
        stage: { select: { id: true, name: true, order: true } },
        createdBy: { select: { id: true, name: true } },
        application: {
          select: {
            id: true,
            cvDriveId: true,
            cvItemId: true,
            cvFileName: true,
            motivation: true,
            appliedAt: true,
          },
        },
      },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityIds = visibleEntityIds(user, 'recruitment:read')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const timeline = await prisma.auditLog.findMany({
      where: {
        target: candidateId,
        action: 'CANDIDATE_STAGE_MOVE',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        meta: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
      take: 50,
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CANDIDATE_VIEWED',
      target: candidateId,
      meta: {
        vacancyId: candidate.vacancy.id,
        mechanism: 'profile-dialog',
      },
    })

    return NextResponse.json({
      data: {
        ...candidate,
        timeline,
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
    console.error('Candidate detail error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
