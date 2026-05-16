import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { downloadDocument, isDocsGraphConfigured, isSafeImageMimeType, graphErrorToStatus, graphDocs } from '@/lib/graph-teams'
import type { ContentBlock, MediaContent } from '@/lib/recruitment/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const vacancy = await prisma.vacancy.findFirst({
      where: { id, status: 'PUBLISHED', deletedAt: null },
      select: { content: true },
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: { message: 'Vacancy not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const driveId = searchParams.get('driveId')
    const itemId = searchParams.get('itemId')

    if (!driveId || !itemId) {
      return NextResponse.json(
        { error: { message: 'driveId and itemId are required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const blocks = Array.isArray(vacancy.content) ? (vacancy.content as unknown as ContentBlock[]) : []
    const mediaContents = blocks
      .filter((b) => b.type === 'media' && b.content)
      .map((b) => b.content as unknown as MediaContent)

    const isReferenced = mediaContents.some(
      (m) => m.driveId === driveId && m.itemId === itemId
    )

    if (!isReferenced) {
      return NextResponse.json(
        { error: { message: 'Photo not found in vacancy', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    if (!isDocsGraphConfigured()) {
      return NextResponse.json(
        { error: { message: 'SharePoint integration not configured', code: 'NOT_CONFIGURED' } },
        { status: 503 }
      )
    }

    const client = await graphDocs()
    const expectedDriveId = process.env.TEAMS_DRIVE_ID
      || (await client.api(`/sites/${process.env.TEAMS_SITE_ID}/drive`).get()).id

    if (driveId !== expectedDriveId) {
      return NextResponse.json(
        { error: { message: 'Invalid drive reference', code: 'FORBIDDEN' } },
        { status: 403 }
      )
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
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
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
    console.error('[public/photo] Error serving vacancy photo:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
