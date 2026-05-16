import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { maskCandidateForViewer } from '@/lib/recruitment/field-mask'
import type { VacancyScorecardCriterion } from '@/lib/recruitment/types'

export async function GET(
  _request: Request,
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
            vacancy: {
              select: { id: true, title: true, entityId: true, scorecardCriteria: true },
            },
            stage: { select: { id: true, name: true, order: true } },
            application: {
              select: {
                cvDriveId: true,
                cvItemId: true,
                cvFileName: true,
                motivation: true,
                appliedAt: true,
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true } },
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

    const GRACE_HOURS = 24
    if (share.evaluationSubmittedAt) {
      const graceEnd = new Date(share.evaluationSubmittedAt.getTime() + GRACE_HOURS * 60 * 60 * 1000)
      if (new Date() > graceEnd) {
        return NextResponse.json(
          { error: { message: 'Evaluation submitted, access expired', code: 'EVALUATION_EXPIRED' } },
          { status: 410 }
        )
      }
    }

    const candidateRaw = share.candidate as unknown as Record<string, unknown>
    const masked = maskCandidateForViewer(candidateRaw, share.visibleFields)

    await createAuditLog({
      actorId: user.id,
      action: 'CANDIDATE_VIEWED',
      target: share.candidateId,
      meta: {
        mechanism: 'share-link',
        shareId: share.id,
        fields: share.visibleFields,
      },
    })

    return NextResponse.json({
      data: {
        candidate: masked,
        share: {
          id: share.id,
          createdBy: share.createdBy,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt,
          evaluationSubmittedAt: share.evaluationSubmittedAt,
          visibleFields: share.visibleFields,
        },
        vacancy: {
          id: share.candidate.vacancy.id,
          title: share.candidate.vacancy.title,
          scorecardCriteria: Array.isArray(share.candidate.vacancy.scorecardCriteria)
            ? ([...(share.candidate.vacancy.scorecardCriteria as unknown as VacancyScorecardCriterion[])].sort((a, b) => a.order - b.order))
            : [],
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
    console.error('Scoped view error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
