import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

const BlockedPeriodSchema = z.object({
  entityId: z.string(),
  jobRoleId: z.string().nullable().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

// GET - List blocked periods
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isHRAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')

    const where: any = { isActive: true }
    if (entityId) {
      where.entityId = entityId
    }

    const blockedPeriods = await prisma.blockedPeriod.findMany({
      where,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
        jobRole: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        { startDate: 'desc' },
      ],
    })

    return NextResponse.json(blockedPeriods)
  } catch (error) {
    console.error('Error fetching blocked periods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create blocked period (alleen HR_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isHRAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = BlockedPeriodSchema.parse(body)

    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'Einddatum moet na startdatum liggen' },
        { status: 400 }
      )
    }

    const blockedPeriod = await prisma.blockedPeriod.create({
      data: {
        entityId: data.entityId,
        jobRoleId: data.jobRoleId || null,
        startDate,
        endDate,
        reason: data.reason || null,
        isActive: data.isActive,
        createdBy: user.id,
      },
      include: {
        entity: true,
        jobRole: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `BlockedPeriod:${blockedPeriod.id}`,
      meta: {
        entityId: blockedPeriod.entityId,
        jobRoleId: blockedPeriod.jobRoleId,
        startDate: blockedPeriod.startDate,
        endDate: blockedPeriod.endDate,
      },
    })

    return NextResponse.json(blockedPeriod, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating blocked period:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Validatie endpoint - check of een starter geblokkeerd is
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entityId, jobRoleTitle, startDate } = body

    if (!entityId || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const date = new Date(startDate)

    // Check voor geblokkeerde periodes
    const blockedPeriods = await prisma.blockedPeriod.findMany({
      where: {
        entityId,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
        OR: [
          { jobRoleId: null }, // Algemene blokkade
          ...(jobRoleTitle
            ? [
                {
                  jobRole: {
                    title: jobRoleTitle,
                  },
                },
              ]
            : []),
        ],
      },
      include: {
        entity: true,
        jobRole: true,
      },
    })

    if (blockedPeriods.length > 0) {
      const block = blockedPeriods[0]
      return NextResponse.json({
        blocked: true,
        reason: block.reason || 'Deze periode is geblokkeerd',
        period: {
          startDate: block.startDate,
          endDate: block.endDate,
        },
        jobRole: block.jobRole?.title || 'Alle functies',
      })
    }

    return NextResponse.json({ blocked: false })
  } catch (error) {
    console.error('Error validating blocked period:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

