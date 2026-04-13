import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { downloadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const document = await prisma.starterDocument.findUnique({
      where: { signingToken: token },
      select: {
        id: true,
        status: true,
        teamsDriveId: true,
        teamsItemId: true,
        fileName: true,
        mimeType: true,
      },
    })

    if (!document) {
      return new NextResponse('Document niet gevonden', { status: 404 })
    }

    if (document.status === 'CANCELLED') {
      return new NextResponse('Document geannuleerd', { status: 410 })
    }

    if (!isDocsGraphConfigured() || !document.teamsDriveId || !document.teamsItemId) {
      return new NextResponse('PDF niet beschikbaar — Teams niet geconfigureerd', { status: 404 })
    }

    const fileBuffer = await downloadDocument(document.teamsDriveId, document.teamsItemId)

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': document.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${document.fileName || 'document.pdf'}"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error serving signing PDF:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
