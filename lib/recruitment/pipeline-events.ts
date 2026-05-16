import { eventBus, type SSEEventType } from '@/lib/events'

export interface CandidateMovedPayload {
  vacancyId: string
  candidateId: string
  fromStageId: string
  toStageId: string
  movedBy: string
  timestamp: string
}

export interface CandidateAddedPayload {
  vacancyId: string
  candidateId: string
  stageId: string
  firstName: string
  lastName: string
  addedBy: string
  timestamp: string
}

export const PIPELINE_EVENTS = {
  CANDIDATE_MOVED: 'recruitment:pipeline:candidate-moved' as SSEEventType,
  CANDIDATE_ADDED: 'recruitment:pipeline:candidate-added' as SSEEventType,
} as const

export function emitCandidateMoved(entityId: string, payload: CandidateMovedPayload) {
  eventBus.emit({
    type: PIPELINE_EVENTS.CANDIDATE_MOVED,
    entityId,
    payload: payload as unknown as Record<string, unknown>,
  })
}

export function emitCandidateAdded(entityId: string, payload: CandidateAddedPayload) {
  eventBus.emit({
    type: PIPELINE_EVENTS.CANDIDATE_ADDED,
    entityId,
    payload: payload as unknown as Record<string, unknown>,
  })
}
