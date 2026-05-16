import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { downloadDocument, isDocsGraphConfigured, isSafeImageMimeType, graphErrorToStatus, graphDocs } from '@/lib/graph-teams'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:read')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id, deletedAt: null },
      select: { entityId: true },
    })

    if (!vacancy) {
      return NextResponse.json({ error: { message: 'Vacancy not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    if (!can(user, 'recruitment:read', { entityId: vacancy.entityId })) {
      return NextResponse.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const driveId = searchParams.get('driveId')
    const itemId = searchParams.get('itemId')

    if (!driveId || !itemId) {
      return NextResponse.json({ error: { message: 'driveId and itemId are required', code: 'VALIDATION_ERROR' } }, { status: 400 })
    }

    if (!isDocsGraphConfigured()) {
      return NextResponse.json({ error: { message: 'SharePoint integration not configured', code: 'NOT_CONFIGURED' } }, { status: 503 })
    }

    const client = await graphDocs()
    const expectedDriveId = process.env.TEAMS_DRIVE_ID
      || (await client.api(`/sites/${process.env.TEAMS_SITE_ID}/drive`).get()).id

    if (driveId !== expectedDriveId) {
      return NextResponse.json({ error: { message: 'Invalid drive reference', code: 'FORBIDDEN' } }, { status: 403 })
    }

    const buffer = await downloadDocument(driveId, itemId)

    const mimeParam = searchParams.get('mimeType')
    const safeMime = mimeParam && isSafeImageMimeType(mimeParam)
      ? mimeParam.split(';')[0].trim()
      : 'image/jpeg'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': safeMime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    if (error?.statusCode) {
      const httpStatus = graphErrorToStatus(error)
      return NextResponse.json({ error: { message: 'SharePoint error', code: 'GRAPH_ERROR' } }, { status: httpStatus })
    }
    console.error('Error serving vacancy photo:', error)
    return NextResponse.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
