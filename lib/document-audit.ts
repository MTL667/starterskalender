import { prisma } from './prisma'

type AuditEvent =
  | 'CREATED'
  | 'EMAIL_SENT'
  | 'EMAIL_OPENED'
  | 'EMAIL_CLICKED'
  | 'EMAIL_DELIVERED'
  | 'EMAIL_BOUNCED'
  | 'VIEWED'
  | 'SIGNED'
  | 'DOWNLOADED'
  | 'FIELDS_PLACED'
  | 'DELETED'
  | 'QES_SENT_TO_QUILL'
  | 'QES_PREPARING'
  | 'QES_WAITING'
  | 'QES_SIGNED'
  | 'QES_DECLINED'
  | 'QES_EXPIRED'
  | 'QES_NEW_SIGNATURE'

export async function logDocumentEvent(
  documentId: string,
  event: AuditEvent,
  options: {
    actor?: string | null
    ip?: string | null
    userAgent?: string | null
    metadata?: Record<string, any>
  } = {}
) {
  try {
    await prisma.documentAuditEvent.create({
      data: {
        documentId,
        event,
        actor: options.actor || null,
        ip: options.ip || null,
        userAgent: options.userAgent || null,
        metadata: options.metadata || undefined,
      },
    })
  } catch (err) {
    console.error(`Failed to log audit event ${event} for document ${documentId}:`, err)
  }
}
