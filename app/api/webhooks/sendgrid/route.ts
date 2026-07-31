import { NextRequest, NextResponse } from 'next/server'
import { logDocumentEvent } from '@/lib/document-audit'
import { prisma } from '@/lib/prisma'

const EVENT_MAP: Record<string, string> = {
  delivered: 'EMAIL_DELIVERED',
  open: 'EMAIL_OPENED',
  click: 'EMAIL_CLICKED',
  bounce: 'EMAIL_BOUNCED',
  dropped: 'EMAIL_BOUNCED',
  spamreport: 'EMAIL_BOUNCED',
}

export async function POST(request: NextRequest) {
  try {
    const events = await request.json()

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Expected array' }, { status: 400 })
    }

    for (const event of events) {
      const documentId = event.documentId || event.custom_args?.documentId
      const pdfBatchItemId = event.pdfBatchItemId || event.custom_args?.pdfBatchItemId
      const eventType = EVENT_MAP[event.event]

      if (pdfBatchItemId && eventType) {
        const data: Record<string, unknown> = {}
        if (event.event === 'delivered') {
          data.status = 'DELIVERED'
          data.deliveredAt = new Date()
        } else if (['bounce', 'dropped', 'spamreport'].includes(event.event)) {
          data.status = 'BOUNCED'
          data.bouncedAt = new Date()
          if (event.reason) data.errorMessage = String(event.reason)
        }
        if (event.sg_message_id) {
          data.sgMessageId = String(event.sg_message_id)
        }
        if (Object.keys(data).length > 0) {
          await prisma.pdfMailBatchItem.updateMany({
            where: { id: String(pdfBatchItemId) },
            data,
          })
        }
      }

      if (!documentId || !eventType) continue

      await logDocumentEvent(documentId, eventType as any, {
        metadata: {
          sgEventId: event.sg_event_id,
          sgMessageId: event.sg_message_id,
          email: event.email,
          timestamp: event.timestamp,
          url: event.url,
          reason: event.reason,
          userAgent: event.useragent,
          ip: event.ip,
        },
      })
    }

    return NextResponse.json({ processed: events.length })
  } catch (error) {
    console.error('SendGrid webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
