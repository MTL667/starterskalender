import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPreviewUrl, isDocsGraphConfigured } from '@/lib/graph-teams'
import { eventBus } from '@/lib/events'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const document = await prisma.starterDocument.findUnique({
      where: { signingToken: token },
      include: {
        starter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entity: { select: { name: true, colorHex: true } },
          },
        },
        prerequisite: { select: { id: true, title: true, status: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 })
    }

    if (document.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Dit document is geannuleerd' }, { status: 410 })
    }

    let previewUrl: string | null = null
    if (isDocsGraphConfigured() && document.teamsDriveId && document.teamsItemId) {
      try {
        previewUrl = await getPreviewUrl(document.teamsDriveId, document.teamsItemId)
      } catch {
        // Preview not available
      }
    }

    return NextResponse.json({
      id: document.id,
      title: document.title,
      status: document.status,
      signingMethod: document.signingMethod,
      fileName: document.fileName,
      dueDate: document.dueDate,
      signedAt: document.signedAt,
      signedByName: document.signedByName,
      previewUrl,
      prerequisite: document.prerequisite,
      starter: document.starter
        ? {
            firstName: document.starter.firstName,
            lastName: document.starter.lastName,
            entityName: document.starter.entity?.name,
            entityColor: document.starter.entity?.colorHex,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching signing document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { signerName } = body

    if (!signerName || typeof signerName !== 'string' || signerName.trim().length < 2) {
      return NextResponse.json({ error: 'Naam is verplicht (min. 2 tekens)' }, { status: 400 })
    }

    const document = await prisma.starterDocument.findUnique({
      where: { signingToken: token },
      include: {
        starter: { select: { id: true, entityId: true } },
        prerequisite: { select: { id: true, status: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 })
    }

    if (document.status === 'SIGNED') {
      return NextResponse.json({ error: 'Dit document is al ondertekend' }, { status: 400 })
    }

    if (document.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Dit document is geannuleerd' }, { status: 410 })
    }

    if (document.prerequisite && document.prerequisite.status !== 'SIGNED') {
      return NextResponse.json(
        { error: 'Een vereist document moet eerst ondertekend worden' },
        { status: 400 }
      )
    }

    if (document.signingMethod === 'QES') {
      return NextResponse.json(
        { error: 'QES ondertekening via Itsme is nog niet beschikbaar' },
        { status: 501 }
      )
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const now = new Date()

    const updated = await prisma.starterDocument.update({
      where: { id: document.id },
      data: {
        status: 'SIGNED',
        signedAt: now,
        signedByIp: ip,
        signedByName: signerName.trim(),
      },
    })

    if (document.taskId) {
      await prisma.task.update({
        where: { id: document.taskId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          completionNotes: `Document "${document.title}" digitaal ondertekend (SES) via signing link`,
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
          action: 'document_signed_external',
        },
      })
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      signedAt: updated.signedAt,
      signedByName: updated.signedByName,
    })
  } catch (error) {
    console.error('Error signing document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
