import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/audit'

const UpdateMaterialSchema = z.object({
  isRequired: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

// PATCH - Update material assignment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id, materialId } = await params
    const user = await requireAdmin()

    const body = await request.json()
    const data = UpdateMaterialSchema.parse(body)

    const jobRoleMaterial = await prisma.jobRoleMaterial.update({
      where: {
        jobRoleId_materialId: {
          jobRoleId: id,
          materialId,
        },
      },
      data,
      include: {
        material: true,
        jobRole: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `JobRoleMaterial:${jobRoleMaterial.id}`,
      meta: {
        jobRole: jobRoleMaterial.jobRole.title,
        material: jobRoleMaterial.material.name,
      },
    })

    return NextResponse.json(jobRoleMaterial)
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating job role material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove material from job role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id, materialId } = await params
    const user = await requireAdmin()

    const jobRoleMaterial = await prisma.jobRoleMaterial.findUnique({
      where: {
        jobRoleId_materialId: {
          jobRoleId: id,
          materialId,
        },
      },
      include: {
        material: true,
        jobRole: true,
      },
    })

    if (!jobRoleMaterial) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.jobRoleMaterial.delete({
      where: {
        jobRoleId_materialId: {
          jobRoleId: id,
          materialId,
        },
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `JobRoleMaterial:${jobRoleMaterial.id}`,
      meta: {
        jobRole: jobRoleMaterial.jobRole.title,
        material: jobRoleMaterial.material.name,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting job role material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

