import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canViewEntity } from '@/lib/rbac'
import { downloadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'

// GET /api/starters/[id]/photo
// Proxy voor de profielfoto van een starter. De binary leeft in SharePoint;
// wij halen hem on-demand op via Graph en serveren hem als image/*.
//
// Bronnen (in volgorde van prioriteit):
//   1. Directe velden op Starter (photoDriveId/photoItemId) — gezet via de
//      "foto kiezen" flow wanneer een specifiek bestand uit de map wordt gekozen.
//   2. `photoUpload` relatie naar StarterTaskUpload — gezet via auto-link bij
//      headshot-raw upload of via de legacy refresh-knop.
//
// Caching: private, 5 minuten.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: {
        entityId: true,
        photoDriveId: true,
        photoItemId: true,
        photoFileName: true,
        photoMimeType: true,
        photoUpload: {
          select: {
            teamsDriveId: true,
            teamsItemId: true,
            mimeType: true,
            fileName: true,
          },
        },
      },
    })

    if (!starter) {
      return new NextResponse('Starter not found', { status: 404 })
    }

    if (starter.entityId && !canViewEntity(user, starter.entityId)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    let driveId: string | null = null
    let itemId: string | null = null
    let mimeType = 'image/jpeg'
    let fileName = 'photo.jpg'

    if (starter.photoDriveId && starter.photoItemId) {
      driveId = starter.photoDriveId
      itemId = starter.photoItemId
      mimeType = starter.photoMimeType || mimeType
      fileName = starter.photoFileName || fileName
    } else if (starter.photoUpload?.teamsDriveId && starter.photoUpload?.teamsItemId) {
      driveId = starter.photoUpload.teamsDriveId
      itemId = starter.photoUpload.teamsItemId
      mimeType = starter.photoUpload.mimeType || mimeType
      fileName = starter.photoUpload.fileName || fileName
    }

    if (!driveId || !itemId || !isDocsGraphConfigured()) {
      return new NextResponse('No photo', { status: 404 })
    }

    const buffer = await downloadDocument(driveId, itemId)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error serving starter photo:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
