import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { filterStartersByRBAC, canMutateStarter, isHRAdmin } from '@/lib/rbac'
import { calculateWeekNumber, getYearInTimezone } from '@/lib/week-utils'
import { createAuditLog } from '@/lib/audit'
import { normalizeString } from '@/lib/utils'
import { createAutomaticTasks } from '@/lib/task-automation'

const StarterSchema = z.object({
  name: z.string().min(1),
  language: z.enum(['NL', 'FR']).default('NL'),
  entityId: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  roleTitle: z.string().nullable().optional(),
  via: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  contractSignedOn: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime(),
  hasExperience: z.boolean().default(false),
  experienceSince: z.string().datetime().nullable().optional(),
  experienceRole: z.string().nullable().optional(),
  experienceEntity: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  desiredEmail: z.string().email().nullable().optional(),
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
        language: data.language,
        entityId: data.entityId,
        region: normalizeString(data.region),
        roleTitle: normalizeString(data.roleTitle),
        via: normalizeString(data.via),
        notes: data.notes, // Behoud originele notes
        contractSignedOn: data.contractSignedOn ? new Date(data.contractSignedOn) : null,
        startDate,
        weekNumber,
        year,
        hasExperience: data.hasExperience,
        experienceSince: data.experienceSince ? new Date(data.experienceSince) : null,
        experienceRole: normalizeString(data.experienceRole),
        experienceEntity: normalizeString(data.experienceEntity),
        phoneNumber: normalizeString(data.phoneNumber),
        desiredEmail: normalizeString(data.desiredEmail),
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

    // Automatisch taken aanmaken op basis van templates
    try {
      const tasks = await createAutomaticTasks(starter)
      console.log(`✅ Created ${tasks.length} automatic tasks for starter ${starter.name}`)
    } catch (taskError) {
      console.error('Failed to create automatic tasks:', taskError)
      // Don't fail the starter creation if task creation fails
    }

    return NextResponse.json(starter, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

