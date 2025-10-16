import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getCurrentUser } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/audit'
import { getVisibleEntities } from '@/lib/rbac'

const EntitySchema = z.object({
  name: z.string().min(1),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  notifyEmails: z.array(z.string().email()).default([]),
  isActive: z.boolean().default(true),
})

// GET - List entities
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const entities = await getVisibleEntities(user)
    return NextResponse.json(entities)
  } catch (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create entity (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const data = EntitySchema.parse(body)

    const entity = await prisma.entity.create({
      data: {
        name: data.name,
        colorHex: data.colorHex,
        notifyEmails: data.notifyEmails,
        isActive: data.isActive,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `Entity:${entity.id}`,
      meta: { name: entity.name },
    })

    return NextResponse.json(entity, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating entity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

