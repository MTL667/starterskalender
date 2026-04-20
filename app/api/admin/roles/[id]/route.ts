/**
 * GET    /api/admin/roles/[id]  → rol-detail incl. permissies + aantal toekenningen
 * PATCH  /api/admin/roles/[id]  → naam, beschrijving, bypassEntityScope, permissies wijzigen
 * DELETE /api/admin/roles/[id]  → verwijder custom rol (system roles niet verwijderbaar)
 *
 * Vereist `admin:roles:manage`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { requirePermission } from '@/lib/authz'
import { isKnownPermission } from '@/lib/authz-registry'

const UpdateRoleSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  bypassEntityScope: z.boolean().optional(),
  permissionKeys: z.array(z.string()).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('admin:roles:manage')
    const { id } = await params
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { assignments: true } },
      },
    })
    if (!role) return NextResponse.json({ error: 'Rol niet gevonden' }, { status: 404 })
    return NextResponse.json({ role })
  } catch (e: any) {
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message }, { status })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission('admin:roles:manage')
    const { id } = await params
    const body = await req.json()
    const data = UpdateRoleSchema.parse(body)

    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) return NextResponse.json({ error: 'Rol niet gevonden' }, { status: 404 })

    // Validate permission-keys
    if (data.permissionKeys) {
      const invalid = data.permissionKeys.filter((k) => !isKnownPermission(k))
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Onbekende permission-keys: ${invalid.join(', ')}` },
          { status: 400 },
        )
      }
    }

    // Safety: last `admin:roles:manage`-assignment mag je niet weghalen van de enige rol die het biedt
    if (data.permissionKeys && role.isSystem && role.key === 'hr-admin') {
      if (!data.permissionKeys.includes('admin:roles:manage')) {
        return NextResponse.json(
          { error: 'HR Administrator moet `admin:roles:manage` behouden (anti-lockout)' },
          { status: 400 },
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: data.name ?? undefined,
          description: data.description === undefined ? undefined : data.description,
          bypassEntityScope: data.bypassEntityScope ?? undefined,
        },
      })

      if (data.permissionKeys) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } })
        if (data.permissionKeys.length > 0) {
          await tx.rolePermission.createMany({
            data: data.permissionKeys.map((permissionKey) => ({ roleId: id, permissionKey })),
            skipDuplicates: true,
          })
        }
      }
    })

    await createAuditLog({
      actorId: user.id,
      action: 'ROLE_UPDATED',
      target: `Role:${id}`,
      meta: { changes: data },
    })

    const updated = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    })
    return NextResponse.json({ role: updated })
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: e.errors }, { status: 400 })
    }
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission('admin:roles:manage')
    const { id } = await params
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { assignments: true } } },
    })
    if (!role) return NextResponse.json({ error: 'Rol niet gevonden' }, { status: 404 })
    if (role.isSystem) {
      return NextResponse.json({ error: 'System-rollen kunnen niet verwijderd worden' }, { status: 400 })
    }
    if (role._count.assignments > 0) {
      return NextResponse.json(
        { error: `Rol is nog toegewezen aan ${role._count.assignments} gebruiker(s). Verwijder eerst de toekenningen.` },
        { status: 400 },
      )
    }

    await prisma.role.delete({ where: { id } })
    await createAuditLog({
      actorId: user.id,
      action: 'ROLE_DELETED',
      target: `Role:${id}`,
      meta: { key: role.key, name: role.name },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status })
  }
}
