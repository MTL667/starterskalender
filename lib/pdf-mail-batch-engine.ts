import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { renderPdfMailTemplate } from '@/lib/pdf-mailer'
import { createAuditLog } from '@/lib/audit'

export function pdfMailStorageRoot() {
  // Private disk path — not under public/ (PDFs must not be statically served)
  return path.join(process.cwd(), 'storage', 'pdf-mailer')
}

export async function ensurePdfMailDir(batchId: string) {
  const dir = path.join(pdfMailStorageRoot(), batchId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function runPdfMailBatch(batchId: string): Promise<void> {
  // Compare-and-swap: only DRAFT or FAILED may enter SENDING
  const claimed = await prisma.pdfMailBatch.updateMany({
    where: { id: batchId, status: { in: ['DRAFT', 'FAILED'] } },
    data: { status: 'SENDING', startedAt: new Date(), errorMessage: null },
  })
  if (claimed.count === 0) return

  const batch = await prisma.pdfMailBatch.findUnique({
    where: { id: batchId },
    include: { items: { orderBy: { sortIndex: 'asc' } } },
  })
  if (!batch) return

  try {
    for (const item of batch.items) {
      if (['SKIPPED', 'SENT', 'DELIVERED', 'BOUNCED'].includes(item.status)) continue
      if (!item.recipientEmail || !item.pdfStoragePath || !item.pdfFileName) {
        await prisma.pdfMailBatchItem.update({
          where: { id: item.id },
          data: { status: 'FAILED', errorMessage: 'Missing recipient or PDF' },
        })
        continue
      }

      try {
        const bytes = await fs.readFile(item.pdfStoragePath)
        if (bytes.length < 5 || bytes.subarray(0, 5).toString('utf8') !== '%PDF-') {
          await prisma.pdfMailBatchItem.update({
            where: { id: item.id },
            data: { status: 'FAILED', errorMessage: 'File is not a valid PDF' },
          })
          continue
        }

        const subject = renderPdfMailTemplate(batch.subject, {
          name: item.recipientName,
          email: item.recipientEmail,
          filename: item.pdfFileName,
        })
        const html = renderPdfMailTemplate(batch.bodyHtml, {
          name: item.recipientName,
          email: item.recipientEmail,
          filename: item.pdfFileName,
        }, { escapeHtml: true })

        const { messageId } = await sendEmail({
          to: item.recipientEmail,
          from: batch.fromEmail,
          subject,
          html,
          customArgs: {
            pdfBatchItemId: item.id,
            pdfBatchId: batchId,
          },
          attachments: [
            {
              content: bytes.toString('base64'),
              filename: item.pdfFileName,
              type: 'application/pdf',
            },
          ],
        })

        await prisma.pdfMailBatchItem.updateMany({
          where: { id: item.id, status: 'PENDING' },
          data: {
            status: 'SENT',
            sgMessageId: messageId || null,
            sentAt: new Date(),
            errorMessage: null,
          },
        })
      } catch (err: any) {
        const message =
          err?.response?.body?.errors?.[0]?.message ||
          err?.message ||
          'Send failed'
        await prisma.pdfMailBatchItem.update({
          where: { id: item.id },
          data: { status: 'FAILED', errorMessage: String(message) },
        })
      }
    }

    const refreshed = await prisma.pdfMailBatchItem.findMany({
      where: { batchId, status: { not: 'SKIPPED' } },
      select: { status: true },
    })
    const sentish = refreshed.filter(i => ['SENT', 'DELIVERED', 'BOUNCED'].includes(i.status)).length
    const failed = refreshed.filter(i => i.status === 'FAILED').length
    const finalStatus = sentish === 0 && failed > 0 ? 'FAILED' : 'COMPLETED'

    await prisma.pdfMailBatch.update({
      where: { id: batchId },
      data: { status: finalStatus, completedAt: new Date() },
    })

    await createAuditLog({
      actorId: batch.createdBy,
      action: 'CREATE',
      target: `PdfMailBatch:${batchId}`,
      meta: {
        itemCount: batch.items.length,
        leftoverEmails: batch.leftoverEmails,
        leftoverPdfNames: batch.leftoverPdfNames,
        finalStatus,
      },
    })
  } catch (err: any) {
    await prisma.pdfMailBatch.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: err.message || 'Batch failed',
      },
    })
  }
}
