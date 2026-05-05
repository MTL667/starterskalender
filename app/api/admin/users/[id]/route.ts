import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'

const UpdateUserSchema = z.object({
  name: z.string().optional(),
  locale: z.enum(['nl', 'fr']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isHRAdmin(currentUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateUserSchema.parse(body)

    const prismaData: Record<string, unknown> = {}
    if (data.name !== undefined) prismaData.name = data.name
    if (data.locale !== undefined) prismaData.locale = data.locale

    const updated = await prisma.user.update({
      where: { id },
      data: prismaData,
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
      },
    })

    await createAuditLog({
      actorId: currentUser.id,
      action: 'UPDATE',
      target: `User:${updated.id}`,
      meta: { changes: data },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: error.errors }, { status: 400 })
    }
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 })
    }
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isHRAdmin(currentUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (id === currentUser.id) {
      return NextResponse.json({ error: 'Je kunt jezelf niet verwijderen' }, { status: 400 })
    }

    const user = await prisma.user.delete({
      where: { id: id },
    })

    await createAuditLog({
      actorId: currentUser.id,
      action: 'DELETE',
      target: `User:${user.id}`,
      meta: { email: user.email },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
