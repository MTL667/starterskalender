import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/audit'

const UpdateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional(),
})

// PATCH - Update entity (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const data = UpdateEntitySchema.parse(body)

    const entity = await prisma.entity.update({
      where: { id: params.id },
      data,
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `Entity:${entity.id}`,
      meta: { name: entity.name, changes: Object.keys(data) },
    })

    return NextResponse.json(entity)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating entity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete entity (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const entity = await prisma.entity.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.entity.delete({
      where: { id: params.id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `Entity:${params.id}`,
      meta: { name: entity.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting entity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

