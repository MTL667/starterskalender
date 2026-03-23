import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { filterStartersByRBAC, canMutateStarter, isHRAdmin } from '@/lib/rbac'
import { calculateWeekNumber, getYearInTimezone } from '@/lib/week-utils'
import { createAuditLog } from '@/lib/audit'
import { normalizeString } from '@/lib/utils'
import { createAutomaticTasks } from '@/lib/task-automation'

const VALID_TYPES = ['ONBOARDING', 'OFFBOARDING', 'MIGRATION'] as const

const StarterSchema = z.object({
  type: z.enum(VALID_TYPES).default('ONBOARDING'),
  name: z.string().min(1),
  language: z.enum(['NL', 'FR']).default('NL'),
  entityId: z.string().nullable().optional(),
  fromEntityId: z.string().nullable().optional(),
  fromRoleTitle: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  roleTitle: z.string().nullable().optional(),
  via: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  contractSignedOn: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  isPendingBoarding: z.boolean().default(false),
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
    const type = searchParams.get('type')
    const includePending = searchParams.get('includePending') === 'true' && user.role === 'HR_ADMIN'

    let where: any = {}
    const andConditions: any[] = []

    if (year) {
      if (includePending) {
        andConditions.push({
          OR: [
            { year: parseInt(year) },
            { isPendingBoarding: true },
          ],
        })
      } else {
        where.year = parseInt(year)
      }
    }

    if (entityId) {
      where.entityId = entityId
    }

    if (type && VALID_TYPES.includes(type as any)) {
      where.type = type
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { roleTitle: { contains: search, mode: 'insensitive' } },
          { region: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    // Non-HR_ADMIN users never see pending boarding starters
    if (user.role !== 'HR_ADMIN') {
      where.isPendingBoarding = false
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
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
        fromEntity: {
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
    console.log('📥 POST /api/starters - received type:', body.type)
    const data = StarterSchema.parse(body)
    console.log('✅ Parsed type:', data.type)

    const isPending = data.isPendingBoarding || !data.startDate

    let startDate: Date | null = null
    let weekNumber: number | null = null
    let year: number | null = null

    if (data.startDate && !isPending) {
      startDate = new Date(data.startDate)
      weekNumber = calculateWeekNumber(startDate)
      year = getYearInTimezone(startDate)
    }

    const starter = await prisma.starter.create({
      data: {
        type: data.type,
        name: normalizeString(data.name)!,
        language: data.language,
        entityId: data.entityId,
        fromEntityId: data.type === 'MIGRATION' ? data.fromEntityId : null,
        fromRoleTitle: data.type === 'MIGRATION' ? normalizeString(data.fromRoleTitle) : null,
        region: normalizeString(data.region),
        roleTitle: normalizeString(data.roleTitle),
        via: normalizeString(data.via),
        notes: data.notes,
        contractSignedOn: data.contractSignedOn ? new Date(data.contractSignedOn) : null,
        startDate,
        weekNumber,
        year,
        isPendingBoarding: isPending,
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
        fromEntity: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `Starter:${starter.id}`,
      meta: { name: starter.name, entityId: starter.entityId, isPendingBoarding: isPending },
    })

    if (isPending) {
      // For pending boarding: create a single task to assign the start date
      try {
        await prisma.task.create({
          data: {
            type: 'HR_ADMIN',
            title: `Startdatum toewijzen aan ${starter.name}`,
            description: `De starter "${starter.name}" is aangemaakt zonder startdatum. Wijs een startdatum toe om de onboarding te activeren.`,
            priority: 'HIGH',
            starterId: starter.id,
            entityId: starter.entityId,
            assignedToId: user.id,
            assignedAt: new Date(),
            createdById: user.id,
          },
        })
        console.log(`📋 Created pending boarding task for starter "${starter.name}"`)
      } catch (taskError) {
        console.error('Failed to create pending boarding task:', taskError)
      }
    } else {
      // Automatisch taken aanmaken op basis van templates
      try {
        console.log(`🚀 Creating tasks for starter "${starter.name}" with type: ${data.type} (starter.type: ${starter.type})`)
        const tasks = await createAutomaticTasks(starter, data.type)
        console.log(`✅ Created ${tasks.length} automatic tasks for starter ${starter.name}`)
      } catch (taskError) {
        console.error('Failed to create automatic tasks:', taskError)
      }
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

