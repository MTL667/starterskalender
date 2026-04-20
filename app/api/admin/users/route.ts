import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { syncLegacyRoleToAssignments } from '@/lib/rbac-sync'

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['HR_ADMIN', 'ENTITY_EDITOR', 'ENTITY_VIEWER', 'GLOBAL_VIEWER']),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isHRAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        legacyRole: true,
        legacyPermissions: true,
        createdAt: true,
        lastLoginAt: true,
        memberships: {
          include: {
            entity: {
              select: {
                name: true,
              },
            },
          },
        },
        roleAssignments: {
          include: {
            role: { select: { id: true, key: true, name: true, isSystem: true } },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Alias legacyRole/legacyPermissions terug naar role/permissions voor de bestaande UI
    const response = users.map((u) => ({
      ...u,
      role: u.legacyRole,
      permissions: u.legacyPermissions,
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isHRAdmin(currentUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = CreateUserSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Dit e-mailadres is al geregistreerd' }, { status: 400 })
    }

    const hashedPassword = await hash(data.password, 12)

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        legacyRole: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        legacyRole: true,
      },
    })

    // Sync naar RBAC v2 assignments zodat de nieuwe can()-checks meteen kloppen.
    await syncLegacyRoleToAssignments(newUser.id)

    await createAuditLog({
      actorId: currentUser.id,
      action: 'CREATE',
      target: `User:${newUser.id}`,
      meta: { email: newUser.email, role: newUser.legacyRole },
    })

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.legacyRole,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: error.errors }, { status: 400 })
    }
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
