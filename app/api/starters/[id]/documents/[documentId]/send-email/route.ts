import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canMutateStarter } from '@/lib/rbac'
import { sendSigningEmail } from '@/lib/email-signing'
import { logDocumentEvent } from '@/lib/document-audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canMutateStarter(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const document = await prisma.starterDocument.findFirst({
      where: { id: documentId, starterId: id },
      include: {
        starter: {
          include: { entity: { select: { name: true } } },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.status !== 'PENDING') {
      return NextResponse.json({ error: 'Document is niet meer in afwachting' }, { status: 400 })
    }

    if (!document.recipientEmail) {
      return NextResponse.json({ error: 'Geen ontvanger e-mail ingesteld' }, { status: 400 })
    }

    if (!document.signingToken) {
      return NextResponse.json({ error: 'Geen signing token beschikbaar' }, { status: 400 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://starterskalender.kevinit.be'
    const signingUrl = `${baseUrl}/sign/${document.signingToken}`

    await sendSigningEmail({
      recipientEmail: document.recipientEmail,
      recipientName: `${document.starter.firstName} ${document.starter.lastName}`,
      signingUrl,
      documents: [{ title: document.title, signingMethod: document.signingMethod }],
      entityName: document.starter.entity?.name || 'Onbekend',
      senderName: user.name || user.email,
      dueDate: document.dueDate,
      language: document.starter.language,
      documentId: document.id,
    })

    await prisma.starterDocument.update({
      where: { id: document.id },
      data: { emailSentAt: new Date() },
    })

    await logDocumentEvent(document.id, 'EMAIL_SENT', {
      actor: user.id,
      metadata: { recipientEmail: document.recipientEmail },
    })

    return NextResponse.json({ success: true, emailSentAt: new Date() })
  } catch (error) {
    console.error('Error sending signing email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
