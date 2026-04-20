import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { uploadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'

// POST /api/tasks/[id]/uploads — upload een foto/bestand voor deze taak naar SharePoint
// Multipart form-data: `file` (required), `variant` (optional)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user as any
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        starter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entity: { select: { id: true, name: true } },
          },
        },
      },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Permissions: assignee of admin
    const isAdmin = user.role === 'HR_ADMIN'
    const isAssignedToMe = task.assignedToId === user.id
    if (!isAdmin && !isAssignedToMe) {
      return NextResponse.json(
        { error: 'Only assignee or admin can upload to this task' },
        { status: 403 }
      )
    }

    if (!task.starter) {
      return NextResponse.json(
        { error: 'Task is not linked to a starter; cannot upload' },
        { status: 400 }
      )
    }
    if (!task.starter.entity) {
      return NextResponse.json(
        { error: 'Starter has no entity; cannot determine SharePoint path' },
        { status: 400 }
      )
    }

    // Parse multipart
    const formData = await req.formData()
    const file = formData.get('file')
    const variant = (formData.get('variant') as string | null) || null

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const blob = file as Blob & { name?: string; type?: string }
    const originalName = (blob as any).name || 'upload'
    const mimeType = (blob as any).type || 'application/octet-stream'
    const arrayBuf = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    // Template config voor uploadFolder
    let uploadFolder: string | null = null
    if (task.templateId) {
      const template = await prisma.taskTemplate.findUnique({
        where: { id: task.templateId },
        select: { uploadFolder: true },
      })
      uploadFolder = template?.uploadFolder || null
    }

    // Maak een stabiele filename: {variant|timestamp}-{originalName}
    const timestamp = Date.now()
    const cleanOriginal = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const prefix = variant ? variant : `${timestamp}`
    const fileName = `${prefix}-${cleanOriginal}`

    let sharePointPath = `local://${task.id}/${fileName}` // fallback als Graph niet configured
    if (isDocsGraphConfigured()) {
      try {
        const uploaded = await uploadDocument(
          task.starter.entity.name,
          task.starter.lastName,
          task.starter.firstName,
          fileName,
          buffer,
          uploadFolder || undefined
        )
        sharePointPath = uploaded.path
      } catch (err) {
        console.error('SharePoint upload failed:', err)
        return NextResponse.json(
          { error: 'SharePoint upload failed', details: (err as Error).message },
          { status: 502 }
        )
      }
    } else {
      console.warn('⚠️  Docs Graph not configured — upload not persisted to SharePoint')
    }

    const upload = await prisma.starterTaskUpload.create({
      data: {
        taskId: task.id,
        fileName,
        sharePointPath,
        mimeType,
        sizeBytes: buffer.length,
        variant,
        uploadedById: user.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'TASK_UPLOAD',
        target: `Task:${task.id}`,
        meta: {
          taskId: task.id,
          uploadId: upload.id,
          variant,
          sharePointPath,
        },
      },
    })

    return NextResponse.json(upload)
  } catch (error) {
    console.error('Error uploading task file:', error)
    return NextResponse.json(
      { error: 'Failed to upload', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// GET /api/tasks/[id]/uploads — lijst alle uploads voor deze taak
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const uploads = await prisma.starterTaskUpload.findMany({
      where: { taskId: id },
      orderBy: { uploadedAt: 'desc' },
    })
    return NextResponse.json(uploads)
  } catch (error) {
    console.error('Error listing task uploads:', error)
    return NextResponse.json(
      { error: 'Failed to list uploads', details: (error as Error).message },
      { status: 500 }
    )
  }
}
