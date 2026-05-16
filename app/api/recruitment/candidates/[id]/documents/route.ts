import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { downloadDocument, isDocsGraphConfigured, graphErrorToStatus } from '@/lib/graph-teams'

const CV_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function inferMimeType(fileName: string | null): string {
  if (!fileName) return 'application/octet-stream'
  const ext = fileName.split('.').pop()?.toLowerCase()
  return (ext && CV_MIME_TYPES[ext]) || 'application/octet-stream'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('recruitment:read')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        vacancy: { select: { entityId: true } },
        application: {
          select: { cvDriveId: true, cvItemId: true, cvFileName: true },
        },
      },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityIds = visibleEntityIds(user, 'recruitment:read')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const app = candidate.application
    if (!app?.cvDriveId || !app?.cvItemId) {
      return NextResponse.json(
        { error: { message: 'No CV document available', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (!isDocsGraphConfigured()) {
      return NextResponse.json(
        { error: { message: 'SharePoint integration not configured', code: 'NOT_CONFIGURED' } },
        { status: 503 }
      )
    }

    const buffer = await downloadDocument(app.cvDriveId, app.cvItemId)

    await createAuditLog({
      actorId: user.id,
      action: 'CANDIDATE_DOCUMENT_ACCESSED',
      target: candidateId,
      meta: { fileName: app.cvFileName },
    })

    const mimeType = inferMimeType(app.cvFileName)
    const safeFileName = (app.cvFileName || 'cv').replace(/[^\w.\-]/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${safeFileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error: any) {
    if (error?.statusCode) {
      const httpStatus = graphErrorToStatus(error)
      return NextResponse.json(
        { error: { message: 'SharePoint error', code: 'GRAPH_ERROR' } },
        { status: httpStatus }
      )
    }

    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }

    console.error('Candidate document download error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
