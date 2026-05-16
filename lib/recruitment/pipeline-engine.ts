import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { canMoveToStage } from './pipeline-rules'
import { emitCandidateMoved } from './pipeline-events'

export { canMoveToStage }

export class MoveValidationError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'MoveValidationError'
    this.code = code
  }
}

export interface MoveResult {
  candidateId: string
  stageId: string
  updatedAt: string
}

export async function executeStageMove(params: {
  candidateId: string
  toStageId: string
  actorId: string
}): Promise<MoveResult> {
  const { candidateId, toStageId, actorId } = params

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId, deletedAt: null },
    include: {
      stage: { select: { id: true, name: true, order: true, isTerminal: true, vacancyId: true } },
      vacancy: { select: { id: true, entityId: true } },
    },
  })

  if (!candidate) {
    throw new MoveValidationError('Candidate not found', 'NOT_FOUND')
  }

  if (candidate.status === 'PENDING_VERIFICATION') {
    throw new MoveValidationError('Candidate has not been verified yet', 'INVALID_MOVE')
  }

  const targetStage = await prisma.vacancyStage.findUnique({
    where: { id: toStageId },
    select: { id: true, name: true, order: true, isTerminal: true, vacancyId: true },
  })

  if (!targetStage) {
    throw new MoveValidationError('Target stage not found', 'NOT_FOUND')
  }

  if (targetStage.vacancyId !== candidate.stage.vacancyId) {
    throw new MoveValidationError('Target stage belongs to a different vacancy', 'INVALID_MOVE')
  }

  if (targetStage.id === candidate.stage.id) {
    throw new MoveValidationError('Candidate is already in this stage', 'INVALID_MOVE')
  }

  if (!canMoveToStage(candidate.stage, targetStage)) {
    throw new MoveValidationError(
      'Cannot move backward to a non-terminal stage',
      'INVALID_MOVE'
    )
  }

  const updated = await prisma.candidate.update({
    where: { id: candidateId },
    data: { stageId: toStageId },
    select: { id: true, stageId: true, updatedAt: true },
  })

  await createAuditLog({
    actorId,
    action: 'CANDIDATE_STAGE_MOVE',
    target: candidateId,
    meta: {
      vacancyId: candidate.vacancy.id,
      fromStageId: candidate.stage.id,
      fromStageName: candidate.stage.name,
      toStageId,
      toStageName: targetStage.name,
    },
  })

  try {
    emitCandidateMoved(candidate.vacancy.entityId, {
      vacancyId: candidate.vacancy.id,
      candidateId,
      fromStageId: candidate.stage.id,
      toStageId,
      movedBy: actorId,
      timestamp: updated.updatedAt.toISOString(),
    })
  } catch { /* SSE emit is non-critical — DB commit already succeeded */ }

  return {
    candidateId: updated.id,
    stageId: updated.stageId,
    updatedAt: updated.updatedAt.toISOString(),
  }
}
