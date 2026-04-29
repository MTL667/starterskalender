import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canMutateStarter } from '@/lib/rbac'
import { uploadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'
import { eventBus } from '@/lib/events'
import { logDocumentEvent } from '@/lib/document-audit'
import {
  isQuillConfigured,
  getDefaultSignatureTypes,
  createGuestUser,
  createDocument as createQuillDocument,
  uploadDocumentBinary,
  sendDocument as sendQuillDocument,
  getSigningUrl,
  getDocumentStatus,
} from '@/lib/quill'

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

    const sanitized = documents.map(({ quillSigningUrl: _sensitive, ...doc }) => doc)
    return NextResponse.json(sanitized)
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
    const signaturePlaceholder = formData.get('signaturePlaceholder') as string | null

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    if (signingMethod === 'QES') {
      if (!isQuillConfigured()) {
        return NextResponse.json(
          { error: 'QES ondertekening vereist Quill configuratie (QUILL_API_URL, QUILL_CLIENT_ID, QUILL_API_KEY)' },
          { status: 400 },
        )
      }
      if (!recipientEmail?.trim()) {
        return NextResponse.json(
          { error: 'E-mailadres van ontvanger is verplicht voor QES ondertekening' },
          { status: 400 },
        )
      }
    }

    const nextSortOrder = (starter.documents[0]?.sortOrder ?? -1) + 1
    const buffer = Buffer.from(await file.arrayBuffer())

    if (!isDocsGraphConfigured() || !starter.entity) {
      return NextResponse.json(
        { error: 'Teams/SharePoint is niet geconfigureerd. Configureer AZURE_DOCS_* omgevingsvariabelen.' },
        { status: 400 }
      )
    }

    const result = await uploadDocument(
      starter.entity.name,
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

    let updated = await prisma.starterDocument.update({
      where: { id: document.id },
      data: { taskId: task.id },
    })

    await logDocumentEvent(document.id, 'CREATED', { actor: user.id })

    if (signingMethod === 'QES' && isQuillConfigured() && recipientEmail) {
      try {
        const webhookUrl = `${process.env.NEXTAUTH_URL || 'https://starterskalender.kevinit.be'}/api/webhooks/quill`

        const guestUser = await createGuestUser(
          recipientEmail,
          starter.firstName,
          starter.lastName,
        )

        const quillDoc = await createQuillDocument({
          name: title,
          webhookUrl,
          signerUserId: guestUser.id,
          signatureTypes: getDefaultSignatureTypes(),
          ...(signaturePlaceholder ? { signaturePlaceholder } : {}),
        })

        await uploadDocumentBinary(quillDoc.documentId, buffer)

        // Poll for PREPARING state (Quill needs a moment to process the PDF)
        let ready = false
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 1000))
          const status = await getDocumentStatus(quillDoc.documentId)
          if (status.state === 'PREPARING' || status.state === 'WAITING_FOR_SIGNATURES') {
            ready = true
            break
          }
          if (status.state === 'PREPARING_FAILED') {
            throw new Error(`Quill document processing failed: ${status.creationError}`)
          }
        }

        let quillSigningUrl: string | null = null
        if (ready) {
          await sendQuillDocument(quillDoc.documentId)
          quillSigningUrl = await getSigningUrl(quillDoc.documentId, guestUser.id)
        }

        updated = await prisma.starterDocument.update({
          where: { id: document.id },
          data: {
            quillDocumentId: quillDoc.documentId,
            quillUserId: guestUser.id,
            quillSigningUrl,
            quillState: ready ? 'WAITING_FOR_SIGNATURES' : 'CREATED',
          },
        })

        await logDocumentEvent(document.id, 'QES_SENT_TO_QUILL', {
          actor: user.id,
          metadata: {
            quillDocumentId: quillDoc.documentId,
            quillUserId: guestUser.id,
            ready,
          },
        })
      } catch (quillErr) {
        console.error('Failed to set up Quill QES document:', quillErr)
        updated = await prisma.starterDocument.update({
          where: { id: document.id },
          data: { quillState: 'SETUP_FAILED' },
        })
      }
    }

    eventBus.emit({
      type: 'starter:updated',
      entityId: starter.entityId || '*',
      payload: { starterId: id, action: 'document_added' },
    })

    const { quillSigningUrl: _sensitive, ...safeResponse } = updated
    return NextResponse.json(safeResponse, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
