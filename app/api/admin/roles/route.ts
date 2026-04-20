/**
 * GET  /api/admin/roles         → alle rollen (system + custom) met permissie-tellers
 * POST /api/admin/roles         → nieuwe custom rol aanmaken
 *
 * Vereist `admin:roles:manage`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { requirePermission } from '@/lib/authz'
import { isKnownPermission } from '@/lib/authz-registry'

const CreateRoleSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Alleen kleine letters, cijfers en koppeltekens toegestaan'),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  bypassEntityScope: z.boolean().default(false),
  permissionKeys: z.array(z.string()).default([]),
})

export async function GET() {
  try {
    const user = await requirePermission('admin:roles:manage')
    const roles = await prisma.role.findMany({
      include: {
        _count: { select: { permissions: true, assignments: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json({ roles })
  } catch (e: any) {
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('admin:roles:manage')
    const body = await req.json()
    const data = CreateRoleSchema.parse(body)

    // Valideer permission-keys tegen registry
    const invalid = data.permissionKeys.filter((k) => !isKnownPermission(k))
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Onbekende permission-keys: ${invalid.join(', ')}` },
        { status: 400 },
      )
    }

    const existing = await prisma.role.findUnique({ where: { key: data.key } })
    if (existing) {
      return NextResponse.json({ error: 'Er bestaat al een rol met deze key' }, { status: 400 })
    }

    const role = await prisma.role.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        isSystem: false,
        bypassEntityScope: data.bypassEntityScope,
        permissions: {
          create: data.permissionKeys.map((permissionKey) => ({ permissionKey })),
        },
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'ROLE_CREATED',
      target: `Role:${role.id}`,
      meta: { key: role.key, name: role.name, permissions: data.permissionKeys },
    })

    return NextResponse.json({ role }, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: e.errors }, { status: 400 })
    }
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status })
  }
}
