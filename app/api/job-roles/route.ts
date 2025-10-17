import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

const JobRoleSchema = z.object({
  entityId: z.string(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
})

// GET - List job roles (optioneel gefilterd op entityId)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')

    const where: any = {}
    if (entityId) {
      where.entityId = entityId
    }

    const jobRoles = await prisma.jobRole.findMany({
      where,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
      },
      orderBy: [
        { entityId: 'asc' },
        { order: 'asc' },
        { title: 'asc' },
      ],
    })

    return NextResponse.json(jobRoles)
  } catch (error) {
    console.error('Error fetching job roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new job role (alleen HR_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isHRAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = JobRoleSchema.parse(body)

    const jobRole = await prisma.jobRole.create({
      data: {
        entityId: data.entityId,
        title: data.title,
        description: data.description || null,
        isActive: data.isActive,
        order: data.order,
      },
      include: {
        entity: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `JobRole:${jobRole.id}`,
      meta: { title: jobRole.title, entityId: jobRole.entityId },
    })

    return NextResponse.json(jobRole, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating job role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

