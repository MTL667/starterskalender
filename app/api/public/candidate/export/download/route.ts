import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: { message: 'Token required' } }, { status: 400 })
  }

  const exportReq = await prisma.dataExportRequest.findUnique({
    where: { token },
  })

  if (!exportReq) {
    return NextResponse.json({ error: { message: 'Export not found' } }, { status: 404 })
  }

  if (exportReq.expiresAt < new Date()) {
    return NextResponse.json({ error: { message: 'Download link expired' } }, { status: 410 })
  }

  await prisma.dataExportRequest.update({
    where: { id: exportReq.id },
    data: { downloadedAt: new Date() },
  })

  const jsonContent = JSON.stringify(exportReq.data, null, 2)

  return new NextResponse(jsonContent, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="candidate-data-export.json"`,
    },
  })
}
