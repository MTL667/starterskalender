import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { pemToDer } from '@/lib/certificate'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const user = await requirePermission('admin:entities:manage')
    const { entityId } = await params

    if (!can(user, 'admin:entities:manage', { entityId })) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'No access to this entity' },
        { status: 403 }
      )
    }

    const connection = await prisma.entraAppConnection.findUnique({
      where: { entityId },
      select: { publicCertificatePem: true },
    })

    if (!connection?.publicCertificatePem) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'No certificate found for this entity' },
        { status: 404 }
      )
    }

    const derBuffer = pemToDer(connection.publicCertificatePem)

    return new NextResponse(new Uint8Array(derBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': `attachment; filename="entra-${entityId}.cer"`,
        'Content-Length': derBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 })
    }
    console.error('Error downloading certificate:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to download certificate' },
      { status: 500 }
    )
  }
}
