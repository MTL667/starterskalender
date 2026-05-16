import { prisma } from './prisma'
import { createHash } from 'crypto'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'CANCEL_STARTER'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'SEND_MAIL'
  | 'LOGIN'
  | 'LOGOUT'
  | 'INVITE_SENT'
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'ROOM_CREATED'
  | 'ROOM_UPDATED'
  | 'ROOM_DELETED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_UNASSIGNED'
  | 'STARTER_PHOTO_REFRESH'
  | 'STARTER_PHOTO_PICK'
  | 'CARDDAV_SYNC'
  | 'CARDDAV_SOFT_DELETE'
  | 'CARDDAV_HARD_DELETE'
  | 'CARDDAV_BULK_SYNC'
  | 'CARDDAV_AUTO_CLEANUP'
  | 'CARDDAV_ENTITY_SWITCH'
  | 'CANDIDATE_STAGE_MOVE'
  | 'CANDIDATE_VIEWED'
  | 'CANDIDATE_DOCUMENT_ACCESSED'
  | 'CANDIDATE_SHARED'
  | 'CANDIDATE_SHARE_REVOKED'
  | 'CANDIDATE_EVALUATED'
  | 'CANDIDATE_EMAIL_SENT'
  | 'CANDIDATE_REJECTED'
  | 'CONSENT_RENEWED'
  | 'CANDIDATE_RETENTION_EXPIRED'
  | 'CANDIDATE_DATA_PURGED'
  | 'CANDIDATE_ERASURE_REQUESTED'
  | 'CANDIDATE_DATA_EXPORTED'
  | 'AUDIT_REPORT_EXPORTED'

export interface AuditLogInput {
  actorId?: string
  action: AuditAction
  target?: string
  meta?: Record<string, any>
}

/**
 * Maakt een audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const timestamp = new Date().toISOString()

    await prisma.$transaction(async (tx) => {
      const prevEntry = await tx.auditLog.findFirst({
        orderBy: { sequenceNum: 'desc' },
        select: { integrityHash: true },
      })

      const prevHash = prevEntry?.integrityHash ?? 'genesis'
      const hashPayload = `${prevHash}|${input.action}|${input.target ?? ''}|${timestamp}`
      const integrityHash = createHash('sha256').update(hashPayload).digest('hex')

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.action,
          target: input.target,
          meta: input.meta ? JSON.parse(JSON.stringify(input.meta)) : null,
          integrityHash,
        },
      })
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

// Alias for convenience
export const logAudit = createAuditLog

