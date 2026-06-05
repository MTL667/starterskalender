import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { generateCertificateKeypair } from '@/lib/certificate'
import { encryptEntra } from '@/lib/encryption'

export async function POST(
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
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'No Entra connection for this entity' },
        { status: 404 }
      )
    }

    let keypair
    try {
      keypair = generateCertificateKeypair(`Starterskalender - ${entityId}`)
    } catch (err) {
      console.error('Certificate generation failed:', err)
      return NextResponse.json(
        { error: 'GENERATION_ERROR', message: 'Failed to generate certificate keypair' },
        { status: 500 }
      )
    }

    let encryptedKey: string
    try {
      encryptedKey = encryptEntra(keypair.privateKeyPem)
    } catch (err: any) {
      if (err.message?.includes('ENTRA_ENCRYPTION_KEY')) {
        return NextResponse.json(
          { error: 'CONFIGURATION_ERROR', message: 'Encryption configuration error. Contact your system administrator.' },
          { status: 500 }
        )
      }
      throw err
    }

    await prisma.entraAppConnection.update({
      where: { entityId },
      data: {
        encryptedPrivateKey: encryptedKey,
        publicCertificatePem: keypair.publicCertPem,
        certificateExpiry: keypair.expiresAt,
        certificateThumbprint: keypair.thumbprint,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `EntraAppConnection:${connection.id}:certificate`,
      meta: { entityId, thumbprint: keypair.thumbprint },
    })

    return NextResponse.json({
      thumbprint: keypair.thumbprint,
      expiresAt: keypair.expiresAt.toISOString(),
    })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 })
    }
    console.error('Error generating certificate:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to generate certificate' },
      { status: 500 }
    )
  }
}
