import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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
        localFilePath: true,
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

    if (!document.localFilePath) {
      return new NextResponse('PDF niet beschikbaar', { status: 404 })
    }

    const fullPath = join(process.cwd(), 'data', document.localFilePath)

    if (!existsSync(fullPath)) {
      return new NextResponse('Bestand niet gevonden', { status: 404 })
    }

    const fileBuffer = await readFile(fullPath)

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': document.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${document.fileName || 'document.pdf'}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error serving signing PDF:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
