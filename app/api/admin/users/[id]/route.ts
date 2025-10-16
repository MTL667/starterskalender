import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

const UpdateUserSchema = z.object({
  role: z.enum(['HR_ADMIN', 'ENTITY_EDITOR', 'ENTITY_VIEWER', 'GLOBAL_VIEWER']).optional(),
  name: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HR_ADMIN can update users
    if (session.user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateUserSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    await createAuditLog({
      actorId: session.user.id,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HR_ADMIN can delete users
    if (session.user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent deleting self
    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'Je kunt jezelf niet verwijderen' }, { status: 400 })
    }

    const user = await prisma.user.delete({
      where: { id: params.id },
    })

    await createAuditLog({
      actorId: session.user.id,
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

