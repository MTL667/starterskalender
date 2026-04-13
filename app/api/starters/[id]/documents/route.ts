import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canMutateStarter } from '@/lib/rbac'
import { uploadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'
import { eventBus } from '@/lib/events'
import { logDocumentEvent } from '@/lib/document-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: { entityId: true },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
    }

    const documents = await prisma.starterDocument.findMany({
      where: { starterId: id },
      orderBy: { sortOrder: 'asc' },
      include: {
        prerequisite: { select: { id: true, title: true, status: true } },
        task: { select: { id: true, status: true } },
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canMutateStarter(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id },
      include: {
        entity: { select: { id: true, name: true } },
        documents: { select: { sortOrder: true }, orderBy: { sortOrder: 'desc' }, take: 1 },
      },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string
    const signingMethod = (formData.get('signingMethod') as string) || 'SES'
    const prerequisiteId = formData.get('prerequisiteId') as string | null
    const dueDateStr = formData.get('dueDate') as string | null
    const recipientEmail = formData.get('recipientEmail') as string | null

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    const nextSortOrder = (starter.documents[0]?.sortOrder ?? -1) + 1
    const buffer = Buffer.from(await file.arrayBuffer())

    if (!isDocsGraphConfigured() || !starter.entity) {
      return NextResponse.json(
        { error: 'Teams/SharePoint is niet geconfigureerd. Configureer AZURE_DOCS_* omgevingsvariabelen.' },
        { status: 400 }
      )
    }

    const year = starter.startDate
      ? new Date(starter.startDate).getFullYear()
      : new Date().getFullYear()

    const result = await uploadDocument(
      starter.entity.name,
      year,
      starter.lastName,
      starter.firstName,
      file.name,
      buffer
    )

    const document = await prisma.starterDocument.create({
      data: {
        starterId: id,
        title,
        signingMethod: signingMethod as any,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        sortOrder: nextSortOrder,
        prerequisiteId: prerequisiteId || null,
        dueDate: dueDateStr ? new Date(dueDateStr) : null,
        teamsDriveId: result.driveId,
        teamsItemId: result.itemId,
        teamsPath: result.path,
        recipientEmail: recipientEmail || null,
        uploadedById: user.id,
      },
    })

    const task = await prisma.task.create({
      data: {
        type: 'HR_ADMIN',
        title: `Document ondertekenen: ${title}`,
        description: `${starter.firstName} ${starter.lastName} moet "${title}" ondertekenen`,
        status: 'PENDING',
        priority: 'MEDIUM',
        starterId: id,
        entityId: starter.entityId,
        dueDate: dueDateStr ? new Date(dueDateStr) : null,
      },
    })

    const updated = await prisma.starterDocument.update({
      where: { id: document.id },
      data: { taskId: task.id },
    })

    await logDocumentEvent(document.id, 'CREATED', { actor: user.id })

    eventBus.emit({
      type: 'starter:updated',
      entityId: starter.entityId || '*',
      payload: { starterId: id, action: 'document_added' },
    })

    return NextResponse.json(updated, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
