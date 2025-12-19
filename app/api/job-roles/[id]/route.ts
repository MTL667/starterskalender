import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

const UpdateJobRoleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
})

// PATCH - Update job role (alleen HR_ADMIN)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || !isHRAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateJobRoleSchema.parse(body)

    const jobRole = await prisma.jobRole.update({
      where: { id: id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.order !== undefined && { order: data.order }),
      },
      include: {
        entity: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `JobRole:${jobRole.id}`,
      meta: { title: jobRole.title, changes: Object.keys(data) },
    })

    return NextResponse.json(jobRole)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating job role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete job role (alleen HR_ADMIN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || !isHRAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const jobRole = await prisma.jobRole.findUnique({
      where: { id: id },
      select: { id: true, title: true },
    })

    if (!jobRole) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.jobRole.delete({
      where: { id: id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `JobRole:${id}`,
      meta: { title: jobRole.title },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

