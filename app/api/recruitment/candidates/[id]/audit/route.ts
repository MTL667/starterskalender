import { NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

const CANDIDATE_ACTIONS = [
  'CANDIDATE_VIEWED',
  'CANDIDATE_DOCUMENT_ACCESSED',
  'CANDIDATE_SHARED',
  'CANDIDATE_SHARE_REVOKED',
  'CANDIDATE_EVALUATED',
  'CANDIDATE_STAGE_MOVE',
]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('candidate:read')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, vacancy: { select: { entityId: true } } },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityIds = visibleEntityIds(user, 'candidate:read')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        target: candidateId,
        action: { in: CANDIDATE_ACTIONS },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        meta: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
      take: 100,
    })

    return NextResponse.json({ data: logs })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Audit trail error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
