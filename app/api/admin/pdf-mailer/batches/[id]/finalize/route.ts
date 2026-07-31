import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { pairRecipientsAndPdfs } from '@/lib/pdf-mailer'
import { runPdfMailBatch } from '@/lib/pdf-mail-batch-engine'
import { asRecipientsJson, asUploadedPdfs } from '@/lib/pdf-mail-batch-store'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const batch = await prisma.pdfMailBatch.findUnique({ where: { id } })
  if (!batch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (batch.status !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot finalize batch in status ${batch.status}` }, { status: 409 })
  }

  const existingItems = await prisma.pdfMailBatchItem.count({ where: { batchId: id } })
  if (existingItems > 0) {
    return NextResponse.json({ error: 'Batch already finalized' }, { status: 409 })
  }

  const recipients = asRecipientsJson(batch.recipientsJson)
  const pdfs = asUploadedPdfs(batch.uploadedPdfs)

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients on batch' }, { status: 400 })
  }
  if (pdfs.length === 0) {
    return NextResponse.json({ error: 'Upload at least one PDF before finalize' }, { status: 400 })
  }

  const pairing = pairRecipientsAndPdfs(recipients, pdfs)

  try {
    await prisma.$transaction(async (tx) => {
      const stillDraft = await tx.pdfMailBatch.updateMany({
        where: { id, status: 'DRAFT' },
        data: {
          leftoverEmails: pairing.leftoverEmails,
          leftoverPdfNames: pairing.leftoverPdfNames,
        },
      })
      if (stillDraft.count === 0) {
        throw new Error('NOT_DRAFT')
      }

      const itemCount = await tx.pdfMailBatchItem.count({ where: { batchId: id } })
      if (itemCount > 0) {
        throw new Error('ALREADY_FINALIZED')
      }

      await tx.pdfMailBatchItem.createMany({
        data: pairing.pairs.map(p => ({
          batchId: id,
          sortIndex: p.sortIndex,
          recipientEmail: p.recipient.email,
          recipientName: p.recipient.name || null,
          pdfFileName: p.pdf.fileName,
          pdfStoragePath: p.pdf.storagePath,
          status: 'PENDING',
        })),
      })

      if (pairing.leftoverEmails.length) {
        await tx.pdfMailBatchItem.createMany({
          data: pairing.leftoverEmails.map((email, idx) => {
            const recipient = recipients.find(r => r.email === email)!
            return {
              batchId: id,
              sortIndex: pairing.pairs.length + idx,
              recipientEmail: recipient.email,
              recipientName: recipient.name || null,
              status: 'SKIPPED',
              errorMessage: 'No PDF available for this recipient',
            }
          }),
        })
      }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'NOT_DRAFT' || msg === 'ALREADY_FINALIZED') {
      return NextResponse.json(
        { error: msg === 'NOT_DRAFT' ? 'Batch is no longer DRAFT' : 'Batch already finalized' },
        { status: 409 }
      )
    }
    throw err
  }

  runPdfMailBatch(id).catch(err => {
    console.error(`Pdf mail batch ${id} failed:`, err)
  })

  return NextResponse.json({
    batchId: id,
    pairCount: pairing.pairs.length,
    leftoverEmails: pairing.leftoverEmails,
    leftoverPdfNames: pairing.leftoverPdfNames,
    started: true,
  })
}
