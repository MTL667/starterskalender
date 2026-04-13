import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { downloadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const document = await prisma.starterDocument.findFirst({
      where: { id: documentId, starterId: id },
      select: { teamsDriveId: true, teamsItemId: true, signedTeamsItemId: true, status: true, fileName: true, mimeType: true },
    })

    const itemId = document?.status === 'SIGNED' && document?.signedTeamsItemId
      ? document.signedTeamsItemId
      : document?.teamsItemId

    if (!document?.teamsDriveId || !itemId || !isDocsGraphConfigured()) {
      return new NextResponse('PDF niet beschikbaar', { status: 404 })
    }

    const fileBuffer = await downloadDocument(document.teamsDriveId, itemId)

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': document.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${document.fileName || 'document.pdf'}"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error serving PDF:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
