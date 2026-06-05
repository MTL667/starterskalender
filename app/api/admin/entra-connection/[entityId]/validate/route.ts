import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import {
  graphApiService,
  GraphAuthError,
  GraphTransientError,
  GraphRateLimitError,
} from '@/lib/graph-api-service'

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
      select: { id: true, encryptedPrivateKey: true, certificateThumbprint: true },
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'No Entra connection for this entity' },
        { status: 404 }
      )
    }

    if (!connection.encryptedPrivateKey || !connection.certificateThumbprint) {
      return NextResponse.json(
        { error: 'PRECONDITION_FAILED', message: 'Certificate not configured. Generate a keypair first.' },
        { status: 412 }
      )
    }

    try {
      const validation = await graphApiService.validateConsent(entityId)
      const skus = await graphApiService.getSubscribedSkus(entityId)

      await prisma.entraAppConnection.update({
        where: { entityId },
        data: {
          consentStatus: 'healthy',
          lastConsentCheck: new Date(),
        },
      })

      await createAuditLog({
        actorId: user.id,
        action: 'UPDATE',
        target: `EntraAppConnection:${connection.id}:validate`,
        meta: { entityId, result: 'healthy' },
      })

      return NextResponse.json({
        status: 'healthy',
        organizationName: validation.organizationName,
        licenses: skus,
      })
    } catch (err) {
      if (err instanceof GraphAuthError) {
        await prisma.entraAppConnection.update({
          where: { entityId },
          data: {
            consentStatus: 'error',
            lastConsentCheck: new Date(),
          },
        })

        await createAuditLog({
          actorId: user.id,
          action: 'UPDATE',
          target: `EntraAppConnection:${connection.id}:validate`,
          meta: { entityId, result: 'error', errorType: 'auth', message: err.message },
        })

        return NextResponse.json({
          status: 'error',
          errorType: 'auth',
          message: err.message,
          guidance: 'Verify that admin consent has been granted for the app registration in Azure Portal. Navigate to Enterprise Applications → your app → Permissions → Grant admin consent.',
        }, { status: 422 })
      }

      if (err instanceof GraphRateLimitError) {
        return NextResponse.json({
          status: 'rate_limited',
          errorType: 'rate_limit',
          message: 'Microsoft Graph API rate limit reached. Please try again later.',
          retryAfterMs: err.retryAfterMs,
        }, { status: 429 })
      }

      if (err instanceof GraphTransientError) {
        return NextResponse.json({
          status: 'transient_error',
          errorType: 'transient',
          message: err.message,
          guidance: 'This is a temporary issue. Please try again in a few minutes.',
        }, { status: 503 })
      }

      throw err
    }
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 })
    }
    if (error.message?.includes('ENTRA_ENCRYPTION_KEY')) {
      return NextResponse.json(
        { error: 'CONFIGURATION_ERROR', message: 'Encryption configuration error. Contact your system administrator.' },
        { status: 500 }
      )
    }
    console.error('Error validating Entra connection:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to validate connection' },
      { status: 500 }
    )
  }
}
