import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const CreateConnectionSchema = z.object({
  entityId: z.string().min(1, 'Entity ID is required'),
  clientId: z.string().uuid('Client ID must be a valid UUID'),
  tenantId: z.string().uuid('Tenant ID must be a valid UUID'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('admin:entities:manage')
    const body = await req.json()

    const result = CreateConnectionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { entityId, clientId, tenantId } = result.data

    if (!can(user, 'admin:entities:manage', { entityId })) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'No access to this entity' },
        { status: 403 }
      )
    }

    const entity = await prisma.entity.findUnique({ where: { id: entityId } })
    if (!entity) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Entity not found' },
        { status: 404 }
      )
    }

    const existing = await prisma.entraAppConnection.findUnique({
      where: { entityId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'CONFLICT', message: 'Entity already has an Entra ID connection' },
        { status: 409 }
      )
    }

    const connection = await prisma.entraAppConnection.create({
      data: {
        entityId,
        clientId,
        tenantId,
        consentStatus: 'unconfigured',
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `EntraAppConnection:${connection.id}`,
      meta: { entityId, clientId, tenantId },
    })

    return NextResponse.json(connection, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 })
    }
    console.error('Error creating Entra connection:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to create Entra connection' },
      { status: 500 }
    )
  }
}
