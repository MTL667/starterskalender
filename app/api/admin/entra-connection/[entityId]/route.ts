import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const UpdateConnectionSchema = z.object({
  clientId: z.string().uuid('Client ID must be a valid UUID').optional(),
  tenantId: z.string().uuid('Tenant ID must be a valid UUID').optional(),
})

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
      select: {
        id: true,
        entityId: true,
        clientId: true,
        tenantId: true,
        certificateExpiry: true,
        certificateThumbprint: true,
        consentStatus: true,
        lastConsentCheck: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'No Entra connection for this entity' },
        { status: 404 }
      )
    }

    return NextResponse.json(connection)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 })
    }
    console.error('Error fetching Entra connection:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch Entra connection' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const body = await req.json()
    const result = UpdateConnectionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const existing = await prisma.entraAppConnection.findUnique({
      where: { entityId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'No Entra connection for this entity' },
        { status: 404 }
      )
    }

    const connection = await prisma.entraAppConnection.update({
      where: { entityId },
      data: result.data,
      select: {
        id: true,
        entityId: true,
        clientId: true,
        tenantId: true,
        certificateExpiry: true,
        certificateThumbprint: true,
        consentStatus: true,
        lastConsentCheck: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `EntraAppConnection:${connection.id}`,
      meta: { entityId, changes: result.data },
    })

    return NextResponse.json(connection)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 })
    }
    console.error('Error updating Entra connection:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to update Entra connection' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const existing = await prisma.entraAppConnection.findUnique({
      where: { entityId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'No Entra connection for this entity' },
        { status: 404 }
      )
    }

    const orphanedConfigs = await prisma.licenseConfig.findMany({
      where: { jobRole: { entityId } },
      include: { jobRole: { select: { title: true } } },
    })

    const url = new URL(req.url)
    const confirmed = url.searchParams.get('confirmed') === 'true'

    if (orphanedConfigs.length > 0 && !confirmed) {
      return NextResponse.json({
        warning: 'ORPHANED_CONFIGS',
        message: 'This entity has active license configurations that will become inactive.',
        affectedFunctions: orphanedConfigs.map(c => c.jobRole.title),
        confirmUrl: `?confirmed=true`,
      }, { status: 409 })
    }

    await prisma.entraAppConnection.delete({ where: { entityId } })

    if (orphanedConfigs.length > 0) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'ENTRA_CONNECTION_REMOVED',
          title: 'Entra ID verbinding verwijderd',
          message: `De Entra ID verbinding is verwijderd. Licentieconfiguraties voor de volgende functies zijn nu inactief: ${orphanedConfigs.map(c => c.jobRole.title).join(', ')}`,
          linkUrl: '/admin/entities',
        },
      })
    }

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `EntraAppConnection:${existing.id}`,
      meta: { entityId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 })
    }
    console.error('Error deleting Entra connection:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to delete Entra connection' },
      { status: 500 }
    )
  }
}
