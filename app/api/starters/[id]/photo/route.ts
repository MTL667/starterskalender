import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canViewEntity } from '@/lib/rbac'
import { downloadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'

// GET /api/starters/[id]/photo
// Proxy voor de profielfoto van een starter. De binary leeft in SharePoint;
// wij halen hem on-demand op via Graph en serveren hem als image/*.
// Caching: private, 5 minuten — foto's wijzigen zelden maar een nieuwe upload
// moet zonder hard-refresh zichtbaar worden.
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

    if (!starter?.photoUpload) {
      return new NextResponse('No photo', { status: 404 })
    }

    // Toegangscheck: je moet de starter mogen bekijken om z'n foto te zien.
    if (starter.entityId && !canViewEntity(user, starter.entityId)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { teamsDriveId, teamsItemId, mimeType, fileName } = starter.photoUpload
    if (!teamsDriveId || !teamsItemId || !isDocsGraphConfigured()) {
      return new NextResponse('Photo binary not available', { status: 404 })
    }

    const buffer = await downloadDocument(teamsDriveId, teamsItemId)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType || 'image/jpeg',
        'Content-Disposition': `inline; filename="${fileName || 'photo.jpg'}"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error serving starter photo:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
