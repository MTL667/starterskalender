import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { eventBus } from '@/lib/events'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const { id: candidateId, shareId } = await params
    const user = await requirePermission('candidate:share')

    const share = await prisma.candidateShare.findUnique({
      where: { id: shareId },
      include: {
        candidate: { select: { vacancy: { select: { entityId: true } } } },
        sharedWith: { select: { id: true, name: true } },
      },
    })

    if (!share || share.candidateId !== candidateId) {
      return NextResponse.json(
        { error: { message: 'Share not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (share.revokedAt) {
      return NextResponse.json(
        { error: { message: 'Share already revoked', code: 'ALREADY_REVOKED' } },
        { status: 409 }
      )
    }

    const entityIds = visibleEntityIds(user, 'candidate:share')
    if (entityIds !== 'ALL' && !entityIds.includes(share.candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    await prisma.candidateShare.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CANDIDATE_SHARE_REVOKED',
      target: candidateId,
      meta: {
        shareId,
        revokedUserId: share.sharedWithUserId,
        revokedUserName: share.sharedWith.name,
      },
    })

    eventBus.emit({
      type: 'recruitment:share:revoked',
      entityId: share.candidate.vacancy.entityId,
      payload: { shareId, candidateId },
    })

    return NextResponse.json({ data: { id: shareId, revokedAt: new Date() } })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Share revoke error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
