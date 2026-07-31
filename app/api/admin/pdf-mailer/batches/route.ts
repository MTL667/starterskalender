import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { parseRecipientList } from '@/lib/pdf-mailer'
import { validateSendGridFrom } from '@/lib/sendgrid-from'

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

/** Create DRAFT batch with recipients + mail fields (no PDF binaries). */
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    recipients?: string
    subject?: string
    bodyHtml?: string
    fromEmail?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const recipientsRaw = String(body.recipients || '')
  const subject = String(body.subject || '').trim()
  const bodyHtml = String(body.bodyHtml || '').trim()
  const fromEmail = String(body.fromEmail || '').trim()

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

  const batch = await prisma.pdfMailBatch.create({
    data: {
      createdBy: user.id,
      fromEmail,
      subject,
      bodyHtml,
      status: 'DRAFT',
      recipientsJson: recipients,
      uploadedPdfs: [],
    },
  })

  return NextResponse.json(
    {
      batchId: batch.id,
      recipientCount: recipients.length,
      parseWarnings: parseErrors,
    },
    { status: 201 }
  )
}
