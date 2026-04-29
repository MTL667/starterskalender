import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { eventBus } from '@/lib/events'

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

    const document = await prisma.starterDocument.findFirst({
      where: { id: documentId, starterId: id },
      include: {
        prerequisite: { select: { id: true, status: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.status === 'SIGNED') {
      return NextResponse.json({ error: 'Document is already signed' }, { status: 400 })
    }

    if (document.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Document has been cancelled' }, { status: 400 })
    }

    if (document.prerequisite && document.prerequisite.status !== 'SIGNED') {
      return NextResponse.json(
        { error: 'Prerequisite document must be signed first' },
        { status: 400 }
      )
    }

    if (document.signingMethod === 'QES') {
      return NextResponse.json(
        { error: 'QES documenten worden ondertekend via itsme/eID — gebruik de signing link uit de e-mail' },
        { status: 400 },
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const now = new Date()

    const updated = await prisma.starterDocument.update({
      where: { id: documentId },
      data: {
        status: 'SIGNED',
        signedAt: now,
        signedByIp: ip,
        signedByName: user.name || user.email,
      },
    })

    if (document.taskId) {
      await prisma.task.update({
        where: { id: document.taskId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          completedById: user.id,
          completionNotes: `Document "${document.title}" digitaal ondertekend (SES)`,
        },
      })
    }

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: { entityId: true },
    })

    eventBus.emit({
      type: 'task:completed',
      entityId: starter?.entityId || '*',
      payload: { starterId: id, documentId, action: 'document_signed' },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error signing document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
