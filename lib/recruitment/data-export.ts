import { prisma } from '@/lib/prisma'

export interface CandidateExportData {
  personal: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
    source: string
    status: string
    createdAt: string
  }
  application: {
    motivation: string | null
    responses: any
    appliedAt: string
  } | null
  stageHistory: Array<{
    action: string
    timestamp: string
    meta: any
  }>
  evaluations: Array<{
    evaluatorName: string | null
    scores: any
    comment: string | null
    createdAt: string
  }>
}

export async function generateCandidateExport(candidateId: string): Promise<CandidateExportData | null> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      application: true,
      evaluations: {
        include: { evaluator: { select: { name: true } } },
      },
    },
  })

  if (!candidate) return null

  const auditEntries = await prisma.auditLog.findMany({
    where: { target: candidateId, action: { in: ['CANDIDATE_STAGE_MOVE', 'CANDIDATE_SHARED', 'CANDIDATE_EVALUATED'] } },
    orderBy: { createdAt: 'asc' },
    select: { action: true, createdAt: true, meta: true },
  })

  return {
    personal: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      source: candidate.source,
      status: candidate.status,
      createdAt: candidate.createdAt.toISOString(),
    },
    application: candidate.application ? {
      motivation: candidate.application.motivation,
      responses: candidate.application.responses,
      appliedAt: candidate.application.appliedAt.toISOString(),
    } : null,
    stageHistory: auditEntries.map(e => ({
      action: e.action,
      timestamp: e.createdAt.toISOString(),
      meta: e.meta,
    })),
    evaluations: candidate.evaluations.map(e => ({
      evaluatorName: e.evaluator.name,
      scores: e.scores,
      comment: e.comment,
      createdAt: e.createdAt.toISOString(),
    })),
  }
}
