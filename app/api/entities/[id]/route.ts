import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { createAuditLog } from '@/lib/audit'
import { encrypt } from '@/lib/crypto'

const UpdateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional(),
  inspectorNumberEnabled: z.boolean().optional(),
  inspectorNumberStart: z.number().int().positive().optional(),
  inspectorNumberLabel: z.string().min(1).optional(),
  cardDavEnabled: z.boolean().optional(),
  cardDavUrl: z.string().url().nullable().optional(),
  cardDavUsername: z.string().nullable().optional(),
  cardDavPassword: z.string().nullable().optional(),
  cardDavAddressBook: z.string().nullable().optional(),
})

const CARDDAV_FIELDS = ['cardDavEnabled', 'cardDavUrl', 'cardDavUsername', 'cardDavPassword', 'cardDavAddressBook'] as const

// PATCH - Update entity (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAdmin()

    const body = await request.json()
    const data = UpdateEntitySchema.parse(body)

    const hasCardDavFields = CARDDAV_FIELDS.some((f) => f in body)
    if (hasCardDavFields) {
      const authUser = toAuthorizedUser(user)
      if (!can(authUser, 'carddav:configure')) {
        return NextResponse.json({ error: 'Forbidden: carddav:configure vereist' }, { status: 403 })
      }
    }

    const updateData: Record<string, unknown> = { ...data }
    delete updateData.cardDavPassword

    if (data.cardDavPassword) {
      updateData.cardDavPasswordEnc = encrypt(data.cardDavPassword)
    } else if (data.cardDavPassword === null) {
      updateData.cardDavPasswordEnc = null
    }

    const entity = await prisma.entity.update({
      where: { id },
      data: updateData,
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `Entity:${entity.id}`,
      meta: { name: entity.name, changes: Object.keys(data) },
    })

    const { cardDavPasswordEnc: _stripped, ...safeEntity } = entity
    return NextResponse.json({
      ...safeEntity,
      cardDavPasswordSet: !!entity.cardDavPasswordEnc,
    })
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAdmin()

    const entity = await prisma.entity.findUnique({
      where: { id: id },
      select: { id: true, name: true },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.entity.delete({
      where: { id: id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `Entity:${id}`,
      meta: { name: entity.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting entity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

