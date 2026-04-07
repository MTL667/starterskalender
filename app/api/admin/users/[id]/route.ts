import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'

const UpdateUserSchema = z.object({
  role: z.enum(['HR_ADMIN', 'ENTITY_EDITOR', 'ENTITY_VIEWER', 'GLOBAL_VIEWER']).optional(),
  name: z.string().optional(),
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

    const user = await prisma.user.update({
      where: { id: id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    await createAuditLog({
      actorId: currentUser.id,
      action: 'UPDATE',
      target: `User:${user.id}`,
      meta: { changes: data },
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: error.errors }, { status: 400 })
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
