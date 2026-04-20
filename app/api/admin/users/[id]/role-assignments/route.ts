/**
 * GET    /api/admin/users/[id]/role-assignments         → toekenningen van deze user
 * POST   /api/admin/users/[id]/role-assignments         → rol toekennen met entity-scope
 * DELETE /api/admin/users/[id]/role-assignments?ra=...  → toekenning verwijderen
 *
 * Vereist `admin:users:manage`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { requirePermission } from '@/lib/authz'

const AssignSchema = z.object({
  roleId: z.string().cuid(),
  entityIds: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('admin:users:manage')
    const { id } = await params
    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId: id },
      include: {
        role: {
          include: {
            permissions: { select: { permissionKey: true } },
            _count: { select: { permissions: true } },
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    })
    return NextResponse.json({ assignments })
  } catch (e: any) {
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message }, { status })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requirePermission('admin:users:manage')
    const { id } = await params
    const body = await req.json()
    const data = AssignSchema.parse(body)

    // Valideer dat target user en rol bestaan
    const [targetUser, role] = await Promise.all([
      prisma.user.findUnique({ where: { id } }),
      prisma.role.findUnique({ where: { id: data.roleId } }),
    ])
    if (!targetUser) return NextResponse.json({ error: 'User niet gevonden' }, { status: 404 })
    if (!role) return NextResponse.json({ error: 'Rol niet gevonden' }, { status: 404 })

    // Upsert (unieke constraint @@unique([userId, roleId]))
    const assignment = await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: id, roleId: data.roleId } },
      create: {
        userId: id,
        roleId: data.roleId,
        entityIds: data.entityIds,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        grantedById: currentUser.id,
      },
      update: {
        entityIds: data.entityIds,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: { role: true },
    })

    await createAuditLog({
      actorId: currentUser.id,
      action: 'ROLE_ASSIGNED',
      target: `User:${id}`,
      meta: {
        roleKey: role.key,
        roleName: role.name,
        entityIds: data.entityIds,
        expiresAt: data.expiresAt,
      },
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: e.errors }, { status: 400 })
    }
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requirePermission('admin:users:manage')
    const { id: userId } = await params
    const raId = req.nextUrl.searchParams.get('ra')
    if (!raId) {
      return NextResponse.json({ error: 'Query param ?ra=... vereist' }, { status: 400 })
    }

    const ra = await prisma.userRoleAssignment.findUnique({
      where: { id: raId },
      include: { role: true },
    })
    if (!ra || ra.userId !== userId) {
      return NextResponse.json({ error: 'Toekenning niet gevonden' }, { status: 404 })
    }

    // Anti-lockout: voorkom dat de huidige user zichzelf de laatste admin:roles:manage afneemt
    if (ra.userId === currentUser.id) {
      const hasOther = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: currentUser.id,
          id: { not: raId },
          role: { permissions: { some: { permissionKey: 'admin:roles:manage' } } },
        },
      })
      const thisProvidesManage = await prisma.rolePermission.findUnique({
        where: { roleId_permissionKey: { roleId: ra.roleId, permissionKey: 'admin:roles:manage' } },
      })
      if (thisProvidesManage && !hasOther) {
        return NextResponse.json(
          { error: 'Je kunt jezelf niet de laatste `admin:roles:manage` rol afnemen' },
          { status: 400 },
        )
      }
    }

    await prisma.userRoleAssignment.delete({ where: { id: raId } })

    await createAuditLog({
      actorId: currentUser.id,
      action: 'ROLE_UNASSIGNED',
      target: `User:${userId}`,
      meta: { roleKey: ra.role.key, roleName: ra.role.name },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status })
  }
}
