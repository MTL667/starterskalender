import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getDocumentStatus,
  downloadSignedDocument,
  sendDocument as sendQuillDocument,
  getSigningUrl,
  QuillApiError,
} from '@/lib/quill'
import { uploadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'
import { logDocumentEvent } from '@/lib/document-audit'
import { sendSignedConfirmationEmail, sendSigningEmail } from '@/lib/email-signing'
import { eventBus } from '@/lib/events'

/**
 * Quill webhook receiver. Quill sends POST requests with JSON payloads for
 * document lifecycle events. Must respond 2xx within 3 seconds (Quill retries
 * up to 5x with exponential backoff).
 *
 * No HMAC verification — per Quill docs, verify by fetching authoritative
 * state from their API instead.
 */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, documentId: rawDocId } = body ?? {}
  if (!type || rawDocId == null) {
    return NextResponse.json({ error: 'Missing type or documentId' }, { status: 400 })
  }
  const quillDocId = Number(rawDocId)
  if (!Number.isInteger(quillDocId)) {
    return NextResponse.json({ error: 'documentId must be an integer' }, { status: 400 })
  }

  console.log(`[Quill webhook] type=${type} documentId=${quillDocId}`)

  const document = await prisma.starterDocument.findFirst({
    where: { quillDocumentId: quillDocId },
    include: {
      starter: { include: { entity: true } },
    },
  })

  if (!document) {
    console.warn(`[Quill webhook] No StarterDocument found for quillDocumentId=${quillDocId}`)
    return NextResponse.json({ ok: true })
  }

  try {
    const verified = await getDocumentStatus(quillDocId)
    const verifiedState = verified.state

    await prisma.starterDocument.update({
      where: { id: document.id },
      data: { quillState: verifiedState },
    })

    switch (type) {
      case 'DOCUMENT_PREPARING':
        await logDocumentEvent(document.id, 'QES_PREPARING', {
          metadata: { quillDocId, verifiedState },
        })
        if (!document.quillSigningUrl && document.quillUserId) {
          const doc = document
          const userId = document.quillUserId
          ;(async () => {
            try {
              await sendQuillDocument(quillDocId)
              const signingUrl = await getSigningUrl(quillDocId, userId)
              await prisma.starterDocument.update({
                where: { id: doc.id },
                data: { quillSigningUrl: signingUrl, quillState: 'WAITING_FOR_SIGNATURES' },
              })

              if (doc.recipientEmail && doc.starter && !doc.emailSentAt) {
                await sendSigningEmail({
                  recipientEmail: doc.recipientEmail,
                  recipientName: `${doc.starter.firstName} ${doc.starter.lastName}`,
                  signingUrl,
                  documents: [{ title: doc.title, signingMethod: 'QES' }],
                  entityName: doc.starter.entity?.name || 'Onbekend',
                  senderName: 'Starterskalender',
                  dueDate: doc.dueDate,
                  language: doc.starter.language,
                  documentId: doc.id,
                })
                await prisma.starterDocument.update({
                  where: { id: doc.id },
                  data: { emailSentAt: new Date() },
                })
                await logDocumentEvent(doc.id, 'EMAIL_SENT', {
                  metadata: { recipientEmail: doc.recipientEmail, auto: true, via: 'webhook' },
                })
              }
            } catch (sendErr) {
              console.error(`[Quill webhook] Failed to send document ${quillDocId}:`, sendErr)
              await prisma.starterDocument.update({
                where: { id: doc.id },
                data: { quillState: 'SETUP_FAILED' },
              }).catch(() => {})
            }
          })()
        }
        break

      case 'DOCUMENT_WAITING_FOR_SIGNATURES':
        await logDocumentEvent(document.id, 'QES_WAITING', {
          metadata: { quillDocId, verifiedState },
        })
        break

      case 'NEW_SIGNATURE':
        await logDocumentEvent(document.id, 'QES_NEW_SIGNATURE', {
          metadata: { quillDocId, verifiedState },
        })
        break

      case 'DOCUMENT_FULLY_SIGNED':
        if (verifiedState !== 'DOCUMENT_FULLY_SIGNED') {
          console.warn(`[Quill webhook] FULLY_SIGNED event but verified state is ${verifiedState}, skipping`)
          break
        }
        handleFullySigned(document, quillDocId).catch((err) =>
          console.error(`[Quill webhook] handleFullySigned failed for doc ${quillDocId}:`, err),
        )
        break

      case 'SIGNATURE_DECLINED':
      case 'DOCUMENT_DECLINED':
        await handleDeclined(document, quillDocId, type)
        break

      case 'DOCUMENT_EXPIRE':
        await handleExpired(document, quillDocId)
        break

      case 'DOCUMENT_PREPARING_FAILED':
        console.error(`[Quill webhook] Document preparation failed for doc ${quillDocId}`)
        await prisma.starterDocument.update({
          where: { id: document.id },
          data: { quillState: 'PREPARING_FAILED' },
        })
        await logDocumentEvent(document.id, 'QES_PREPARING', {
          metadata: { quillDocId, verifiedState, error: 'PREPARING_FAILED' },
        })
        break

      case 'DOCUMENT_PAGE_PREVIEWS_READY':
        break

      default:
        console.log(`[Quill webhook] Unhandled event type: ${type}`)
    }
  } catch (err) {
    if (err instanceof QuillApiError) {
      console.error(`[Quill webhook] Verification failed for doc ${quillDocId}:`, err.message)
    } else {
      console.error(`[Quill webhook] Error processing event:`, err)
    }
  }

  return NextResponse.json({ ok: true })
}

async function handleFullySigned(
  document: any,
  quillDocId: number,
) {
  if (document.status === 'SIGNED') {
    console.log(`[Quill webhook] Document ${document.id} already SIGNED, skipping handleFullySigned`)
    return
  }

  const now = new Date()

  let signedTeamsItemId: string | undefined
  if (isDocsGraphConfigured() && document.starter?.entity) {
    try {
      const pdfBuffer = await downloadSignedDocument(quillDocId)
      const origName = (document.fileName || 'document')
        .replace(/\.pdf$/i, '')
        .replace(/-signed$/, '')
      const signedFileName = `${origName}-signed.pdf`

      const result = await uploadDocument(
        document.starter.entity.name,
        document.starter.lastName,
        document.starter.firstName,
        signedFileName,
        pdfBuffer,
      )
      signedTeamsItemId = result.itemId
    } catch (err) {
      console.error(`[Quill webhook] Failed to download/upload signed PDF:`, err)
    }
  }

  if (!signedTeamsItemId && isDocsGraphConfigured()) {
    console.error(`[Quill webhook] Signed PDF not stored in SharePoint for doc ${quillDocId}, not marking SIGNED`)
    await prisma.starterDocument.update({
      where: { id: document.id },
      data: { quillState: 'SIGNED_PDF_UPLOAD_FAILED' },
    })
    return
  }

  await prisma.starterDocument.update({
    where: { id: document.id },
    data: {
      status: 'SIGNED',
      quillState: 'DOCUMENT_FULLY_SIGNED',
      signedAt: now,
      signedByName: 'QES (itsme/eID)',
      ...(signedTeamsItemId ? { signedTeamsItemId } : {}),
    },
  })

  await logDocumentEvent(document.id, 'QES_SIGNED', {
    metadata: { quillDocId, signedTeamsItemId },
  })

  if (document.taskId) {
    await prisma.task.update({
      where: { id: document.taskId },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        completionNotes: `Document "${document.title}" ondertekend via QES (itsme/eID)`,
      },
    })
  }

  if (document.starter) {
    eventBus.emit({
      type: 'task:completed',
      entityId: document.starter.entityId || '*',
      payload: {
        starterId: document.starter.id,
        documentId: document.id,
        action: 'document_signed_qes',
      },
    })
  }

  if (document.recipientEmail && document.starter) {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://starterskalender.kevinit.be'
    try {
      await sendSignedConfirmationEmail({
        recipientEmail: document.recipientEmail,
        recipientName: `${document.starter.firstName} ${document.starter.lastName}`,
        documentTitle: document.title,
        entityName: document.starter.entity?.name || 'Onbekend',
        signedAt: now,
        language: document.starter.language,
        downloadUrl: `${baseUrl}/api/starters/${document.starterId}/documents/${document.id}/pdf?download=1`,
      })
    } catch (emailErr) {
      console.error('[Quill webhook] Failed to send confirmation email:', emailErr)
    }
  }
}

async function handleDeclined(
  document: any,
  quillDocId: number,
  eventType: string,
) {
  await prisma.starterDocument.update({
    where: { id: document.id },
    data: { status: 'CANCELLED', quillState: eventType },
  })

  await logDocumentEvent(document.id, 'QES_DECLINED', {
    metadata: { quillDocId, eventType },
  })
}

async function handleExpired(
  document: any,
  quillDocId: number,
) {
  await prisma.starterDocument.update({
    where: { id: document.id },
    data: { status: 'EXPIRED', quillState: 'DOCUMENT_EXPIRE' },
  })

  await logDocumentEvent(document.id, 'QES_EXPIRED', {
    metadata: { quillDocId },
  })
}
