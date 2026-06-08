import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateLicenseConfigSchema = z.object({
  skuId: z.string().min(1),
  skuDisplayName: z.string().min(1),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobRoleId: string }> }
) {
  try {
    const user = await requirePermission('admin:entities:manage')
    const { jobRoleId } = await params

    const jobRole = await prisma.jobRole.findUnique({
      where: { id: jobRoleId },
      select: { entityId: true },
    })

    if (!jobRole) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Job role not found' }, { status: 404 })
    }

    if (!can(user, 'admin:entities:manage', { entityId: jobRole.entityId })) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'No access to this entity' }, { status: 403 })
    }

    const config = await prisma.licenseConfig.findUnique({
      where: { jobRoleId },
    })

    return NextResponse.json(config || null)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch license config' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ jobRoleId: string }> }
) {
  try {
    const user = await requirePermission('admin:entities:manage')
    const { jobRoleId } = await params

    const jobRole = await prisma.jobRole.findUnique({
      where: { id: jobRoleId },
      select: { entityId: true },
    })

    if (!jobRole) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Job role not found' }, { status: 404 })
    }

    if (!can(user, 'admin:entities:manage', { entityId: jobRole.entityId })) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'No access to this entity' }, { status: 403 })
    }

    const body = await req.json()
    const result = UpdateLicenseConfigSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: result.error.errors[0].message }, { status: 400 })
    }

    const config = await prisma.licenseConfig.upsert({
      where: { jobRoleId },
      create: { jobRoleId, ...result.data },
      update: result.data,
    })

    return NextResponse.json(config)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to update license config' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobRoleId: string }> }
) {
  try {
    const user = await requirePermission('admin:entities:manage')
    const { jobRoleId } = await params

    const jobRole = await prisma.jobRole.findUnique({
      where: { id: jobRoleId },
      select: { entityId: true },
    })

    if (!jobRole) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Job role not found' }, { status: 404 })
    }

    if (!can(user, 'admin:entities:manage', { entityId: jobRole.entityId })) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'No access to this entity' }, { status: 403 })
    }

    await prisma.licenseConfig.deleteMany({ where: { jobRoleId } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to delete license config' }, { status: 500 })
  }
}
