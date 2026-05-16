import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { maskCandidateForViewer } from '@/lib/recruitment/field-mask'
import { ScopedViewClient } from './scoped-view-client'
import type { VacancyScorecardCriterion } from '@/lib/recruitment/types'

interface Props {
  params: Promise<{ token: string }>
}

export default async function SharedCandidatePage({ params }: Props) {
  const { token } = await params
  const user = await requireAuth()

  const share = await prisma.candidateShare.findUnique({
    where: { token },
    include: {
      candidate: {
        include: {
          vacancy: { select: { id: true, title: true, entityId: true, scorecardCriteria: true } },
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
      evaluation: { select: { scores: true, comment: true } },
    },
  })

  if (!share || share.sharedWithUserId !== user.id) {
    notFound()
  }

  const isRevoked = !!share.revokedAt
  const isTimeExpired = share.expiresAt ? share.expiresAt < new Date() : false

  const GRACE_HOURS = 24
  let isEvaluationExpired = false
  let evaluationGraceEnd: Date | null = null
  if (share.evaluationSubmittedAt) {
    evaluationGraceEnd = new Date(share.evaluationSubmittedAt.getTime() + GRACE_HOURS * 60 * 60 * 1000)
    isEvaluationExpired = new Date() > evaluationGraceEnd
  }

  const isExpired = isRevoked || isTimeExpired || isEvaluationExpired

  let maskedCandidate = null
  if (!isExpired) {
    const candidateRaw = share.candidate as unknown as Record<string, unknown>
    maskedCandidate = maskCandidateForViewer(candidateRaw, share.visibleFields)

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
  }

  const scorecardCriteria = (Array.isArray(share.candidate.vacancy.scorecardCriteria)
    ? share.candidate.vacancy.scorecardCriteria
    : []) as unknown as VacancyScorecardCriterion[]

  const existingEvaluation = share.evaluation
    ? {
        scores: share.evaluation.scores as { criterionId: string; score: number }[],
        comment: share.evaluation.comment ?? null,
      }
    : null

  return (
    <ScopedViewClient
      candidate={maskedCandidate}
      vacancyTitle={share.candidate.vacancy.title}
      sharedByName={share.createdBy.name ?? 'Unknown'}
      sharedAt={share.createdAt.toISOString()}
      isRevoked={isRevoked}
      isExpired={isTimeExpired || isEvaluationExpired}
      evaluationSubmittedAt={share.evaluationSubmittedAt?.toISOString() ?? null}
      evaluationGraceEnd={evaluationGraceEnd?.toISOString() ?? null}
      shareToken={token}
      scorecardCriteria={scorecardCriteria}
      existingEvaluation={existingEvaluation}
    />
  )
}
