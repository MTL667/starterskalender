import { prisma } from './prisma'

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
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        target: input.target,
        meta: input.meta ? JSON.parse(JSON.stringify(input.meta)) : null,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // We don't throw - audit logging should not break the application
  }
}

