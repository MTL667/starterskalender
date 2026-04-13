import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canMutateStarter } from '@/lib/rbac'
import { deleteDocument as deleteTeamsDoc, getPreviewUrl, isDocsGraphConfigured } from '@/lib/graph-teams'
import { eventBus } from '@/lib/events'

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
      include: {
        prerequisite: { select: { id: true, title: true, status: true } },
        task: { select: { id: true, status: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    let previewUrl: string | null = null
    const previewItemId = document.status === 'SIGNED' && document.signedTeamsItemId
      ? document.signedTeamsItemId
      : document.teamsItemId

    if (document.teamsDriveId && previewItemId && isDocsGraphConfigured()) {
      try {
        previewUrl = await getPreviewUrl(document.teamsDriveId, previewItemId)
      } catch (err) {
        console.error('Error getting preview URL:', err)
      }
    }

    return NextResponse.json({ ...document, previewUrl })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const body = await request.json()

    if (body.signatureFields !== undefined) {
      const updated = await prisma.starterDocument.update({
        where: { id: documentId },
        data: { signatureFields: body.signatureFields },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.status === 'SIGNED') {
      return NextResponse.json({ error: 'Cannot delete a signed document' }, { status: 400 })
    }

    if (document.teamsDriveId && document.teamsItemId && isDocsGraphConfigured()) {
      try {
        await deleteTeamsDoc(document.teamsDriveId, document.teamsItemId)
      } catch (err) {
        console.error('Error deleting from Teams:', err)
      }
    }

    if (document.taskId) {
      await prisma.task.delete({ where: { id: document.taskId } }).catch(() => {})
    }

    await prisma.starterDocument.delete({ where: { id: documentId } })

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: { entityId: true },
    })

    eventBus.emit({
      type: 'starter:updated',
      entityId: starter?.entityId || '*',
      payload: { starterId: id, action: 'document_deleted' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
