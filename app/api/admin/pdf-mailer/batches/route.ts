import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  isPdfFileName,
  looksLikePdf,
  pairRecipientsAndPdfs,
  parseRecipientList,
} from '@/lib/pdf-mailer'
import { validateSendGridFrom } from '@/lib/sendgrid-from'
import { ensurePdfMailDir, runPdfMailBatch } from '@/lib/pdf-mail-batch-engine'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batches = await prisma.pdfMailBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      fromEmail: true,
      subject: true,
      status: true,
      leftoverEmails: true,
      leftoverPdfNames: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      _count: { select: { items: true } },
    },
  })

  return NextResponse.json({ batches })
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const recipientsRaw = String(form.get('recipients') || '')
  const subject = String(form.get('subject') || '').trim()
  const bodyHtml = String(form.get('bodyHtml') || '').trim()
  const fromEmail = String(form.get('fromEmail') || '').trim()
  const startNow = String(form.get('start') || 'true') !== 'false'

  if (!subject || !bodyHtml || !fromEmail) {
    return NextResponse.json({ error: 'fromEmail, subject and bodyHtml are required' }, { status: 400 })
  }

  const { recipients, errors: parseErrors } = parseRecipientList(recipientsRaw)
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: 'No valid recipients', details: parseErrors },
      { status: 400 }
    )
  }

  const fromCheck = await validateSendGridFrom(fromEmail)
  if (!fromCheck.ok) {
    return NextResponse.json({ error: fromCheck.error }, { status: 400 })
  }

  const files = form.getAll('pdfs').filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ error: 'At least one PDF is required' }, { status: 400 })
  }

  const validated: { fileName: string; buf: Buffer }[] = []
  for (const file of files) {
    if (!isPdfFileName(file.name)) {
      return NextResponse.json({ error: `Not a PDF: ${file.name}` }, { status: 400 })
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: `PDF too large (max 15MB): ${file.name}` }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    if (!looksLikePdf(buf)) {
      return NextResponse.json({ error: `Not a valid PDF file: ${file.name}` }, { status: 400 })
    }
    validated.push({ fileName: file.name, buf })
  }

  const batch = await prisma.pdfMailBatch.create({
    data: {
      createdBy: user.id,
      fromEmail,
      subject,
      bodyHtml,
      status: 'DRAFT',
    },
  })

  const dir = await ensurePdfMailDir(batch.id)
  const pdfs: { fileName: string; storagePath: string }[] = []

  for (let i = 0; i < validated.length; i++) {
    const file = validated[i]
    const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = path.join(dir, `${String(i).padStart(3, '0')}_${safeName}`)
    await fs.writeFile(storagePath, file.buf)
    pdfs.push({ fileName: file.fileName, storagePath })
  }

  const pairing = pairRecipientsAndPdfs(recipients, pdfs)

  await prisma.pdfMailBatchItem.createMany({
    data: pairing.pairs.map(p => ({
      batchId: batch.id,
      sortIndex: p.sortIndex,
      recipientEmail: p.recipient.email,
      recipientName: p.recipient.name || null,
      pdfFileName: p.pdf.fileName,
      pdfStoragePath: p.pdf.storagePath,
      status: 'PENDING',
    })),
  })

  // Leftover recipients as SKIPPED rows for overview
  if (pairing.leftoverEmails.length) {
    await prisma.pdfMailBatchItem.createMany({
      data: pairing.leftoverEmails.map((email, idx) => {
        const recipient = recipients.find(r => r.email === email)!
        return {
          batchId: batch.id,
          sortIndex: pairing.pairs.length + idx,
          recipientEmail: recipient.email,
          recipientName: recipient.name || null,
          status: 'SKIPPED',
          errorMessage: 'No PDF available for this recipient',
        }
      }),
    })
  }

  await prisma.pdfMailBatch.update({
    where: { id: batch.id },
    data: {
      leftoverEmails: pairing.leftoverEmails,
      leftoverPdfNames: pairing.leftoverPdfNames,
    },
  })

  if (startNow) {
    // Fire-and-forget sequential send
    runPdfMailBatch(batch.id).catch(err => {
      console.error(`Pdf mail batch ${batch.id} failed:`, err)
    })
  }

  return NextResponse.json(
    {
      batchId: batch.id,
      pairCount: pairing.pairs.length,
      leftoverEmails: pairing.leftoverEmails,
      leftoverPdfNames: pairing.leftoverPdfNames,
      parseWarnings: parseErrors,
      started: startNow,
    },
    { status: 201 }
  )
}
