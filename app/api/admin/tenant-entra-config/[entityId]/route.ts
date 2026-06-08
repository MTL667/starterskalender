import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateTenantConfigSchema = z.object({
  passwordMinLength: z.number().min(8).max(64).optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireNumbers: z.boolean().optional(),
  passwordRequireSpecialChars: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const user = await requirePermission('admin:entities:manage')
    const { entityId } = await params

    if (!can(user, 'admin:entities:manage', { entityId })) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'No access to this entity' }, { status: 403 })
    }

    const config = await prisma.tenantEntraConfig.findUnique({
      where: { entityId },
    })

    if (!config) {
      return NextResponse.json({
        entityId,
        passwordMinLength: 16,
        passwordRequireUppercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: true,
      })
    }

    return NextResponse.json(config)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch tenant config' }, { status: 500 })
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
      return NextResponse.json({ error: 'FORBIDDEN', message: 'No access to this entity' }, { status: 403 })
    }

    const body = await req.json()
    const result = UpdateTenantConfigSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: result.error.errors[0].message }, { status: 400 })
    }

    const config = await prisma.tenantEntraConfig.upsert({
      where: { entityId },
      create: { entityId, ...result.data },
      update: result.data,
    })

    return NextResponse.json(config)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to update tenant config' }, { status: 500 })
  }
}
