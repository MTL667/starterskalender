import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { syncLegacyRoleToAssignments } from '@/lib/rbac-sync'

const UpdateUserSchema = z.object({
  role: z.enum(['HR_ADMIN', 'ENTITY_EDITOR', 'ENTITY_VIEWER', 'GLOBAL_VIEWER']).optional(),
  name: z.string().optional(),
  permissions: z.array(z.string()).optional(),
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

    // Map legacy veld-namen naar de Prisma-kolommen (RBAC v2).
    const prismaData: Record<string, unknown> = {}
    if (data.name !== undefined) prismaData.name = data.name
    if (data.role !== undefined) prismaData.legacyRole = data.role
    if (data.permissions !== undefined) prismaData.legacyPermissions = data.permissions

    const updated = await prisma.user.update({
      where: { id: id },
      data: prismaData,
      select: {
        id: true,
        email: true,
        name: true,
        legacyRole: true,
        legacyPermissions: true,
      },
    })

    // Sync legacyRole/legacyPermissions naar UserRoleAssignment zodat de nieuwe
    // `can()`-checks altijd overeenkomen met wat admins hier instellen.
    if (data.role !== undefined || data.permissions !== undefined) {
      await syncLegacyRoleToAssignments(id)
    }

    await createAuditLog({
      actorId: currentUser.id,
      action: 'UPDATE',
      target: `User:${updated.id}`,
      meta: { changes: data },
    })

    // Response: alias role/permissions voor backwards-compat met oude UI
    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.legacyRole,
      permissions: updated.legacyPermissions,
    })
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
