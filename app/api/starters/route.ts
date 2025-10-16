import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { filterStartersByRBAC, canMutateStarter, isHRAdmin } from '@/lib/rbac'
import { calculateWeekNumber, getYearInTimezone } from '@/lib/week-utils'
import { createAuditLog } from '@/lib/audit'
import { normalizeString } from '@/lib/utils'

const StarterSchema = z.object({
  name: z.string().min(1),
  entityId: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  roleTitle: z.string().nullable().optional(),
  via: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  startDate: z.string().datetime(),
})

// GET - List starters met filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const entityId = searchParams.get('entityId')
    const search = searchParams.get('search')

    let where: any = {}

    if (year) {
      where.year = parseInt(year)
    }

    if (entityId) {
      where.entityId = entityId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { roleTitle: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filter op basis van RBAC
    where = filterStartersByRBAC(user, where)

    const starters = await prisma.starter.findMany({
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
      orderBy: [{ startDate: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(starters)
  } catch (error) {
    console.error('Error fetching starters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new starter
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canMutate = await canMutateStarter(user)
    if (!canMutate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = StarterSchema.parse(body)

    const startDate = new Date(data.startDate)
    const weekNumber = calculateWeekNumber(startDate)
    const year = getYearInTimezone(startDate)

    const starter = await prisma.starter.create({
      data: {
        name: normalizeString(data.name)!,
        entityId: data.entityId,
        region: normalizeString(data.region),
        roleTitle: normalizeString(data.roleTitle),
        via: normalizeString(data.via),
        notes: data.notes, // Behoud originele notes
        startDate,
        weekNumber,
        year,
        createdBy: user.id,
      },
      include: {
        entity: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `Starter:${starter.id}`,
      meta: { name: starter.name, entityId: starter.entityId },
    })

    return NextResponse.json(starter, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

