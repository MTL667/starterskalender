import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/audit'

const UpdateMaterialSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
})

// PATCH - Update material
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const data = UpdateMaterialSchema.parse(body)

    const material = await prisma.material.update({
      where: { id: params.id },
      data,
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `Material:${material.id}`,
      meta: { name: material.name, changes: Object.keys(data) },
    })

    return NextResponse.json(material)
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete material
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    // Check if material is in use
    const material = await prisma.material.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            jobRoles: true,
            starterMaterials: true,
          },
        },
      },
    })

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    if (material._count.jobRoles > 0 || material._count.starterMaterials > 0) {
      return NextResponse.json(
        { error: 'Cannot delete material that is in use. Please set isActive to false instead.' },
        { status: 400 }
      )
    }

    await prisma.material.delete({
      where: { id: params.id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `Material:${params.id}`,
      meta: { name: material.name },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

