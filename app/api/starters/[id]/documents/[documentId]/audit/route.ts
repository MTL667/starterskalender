import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.starterDocument.findFirst({
      where: { id: documentId, starterId: id },
      select: {
        id: true,
        title: true,
        status: true,
        fileName: true,
        signingMethod: true,
        recipientEmail: true,
        emailSentAt: true,
        signedAt: true,
        signedByIp: true,
        signedByName: true,
        dueDate: true,
        createdAt: true,
        signedTeamsItemId: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const auditEvents = await prisma.documentAuditEvent.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ document, auditEvents })
  } catch (error) {
    console.error('Error fetching document audit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
