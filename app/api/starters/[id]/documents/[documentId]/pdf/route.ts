import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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
      select: { localFilePath: true, fileName: true, mimeType: true },
    })

    if (!document?.localFilePath) {
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
    console.error('Error serving PDF:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
