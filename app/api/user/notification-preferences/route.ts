import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ROLE_ASSIGNMENTS_INCLUDE, toAuthorizedUser, visibleEntityIds, can } from '@/lib/authz'

// GET: Haal notificatie voorkeuren op voor huidige user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        notificationPreferences: {
          include: {
            entity: {
              select: {
                id: true,
                name: true,
                colorHex: true,
              },
            },
          },
        },
        memberships: {
          include: {
            entity: {
              select: {
                id: true,
                name: true,
                colorHex: true,
              },
            },
          },
        },
        ...ROLE_ASSIGNMENTS_INCLUDE,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const authUser = toAuthorizedUser(user)

    let accessibleEntities: string[]
    const scope = visibleEntityIds(authUser, 'starters:read')
    if (scope === 'ALL') {
      const allEntities = await prisma.entity.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      accessibleEntities = allEntities.map(e => e.id)
    } else {
      accessibleEntities = scope
    }

    // Maak default preferences aan voor entiteiten zonder preferences
    const entitiesWithPreferences = new Set(
      user.notificationPreferences.map(p => p.entityId)
    )

    const entitiesToCreate = accessibleEntities
      .filter(entityId => !entitiesWithPreferences.has(entityId))

    if (entitiesToCreate.length > 0) {
      await Promise.all(
        entitiesToCreate.map(entityId =>
          prisma.notificationPreference.create({
            data: {
              userId: user.id,
              entityId,
              weeklyReminder: true,
              monthlySummary: true,
              quarterlySummary: true,
              yearlySummary: true,
              taskEmails: true,
              materialAlerts: true,
              starterCancellation: true,
              starterCreated: true,
              entraAlerts: true,
            },
          })
        )
      )
    }

    // Haal preferences op (inclusief eventueel nieuw aangemaakte)
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: user.id, entityId: { in: accessibleEntities } },
      include: {
        entity: {
          select: { id: true, name: true, colorHex: true },
        },
      },
      orderBy: { entity: { name: 'asc' } },
    })

    // Bepaal per-entity capabilities (welke toggles de user mag zien)
    const membershipSet = new Set(user.memberships.map(m => m.entity.id))
    const capabilities: Record<string, { tasks: boolean; materials: boolean; cancellation: boolean; starterCreated: boolean; entra: boolean }> = {}

    for (const entityId of accessibleEntities) {
      const hasTasks = can(authUser, 'tasks:read:assigned', { entityId }) || can(authUser, 'tasks:read', { entityId })
      const hasMaterials = can(authUser, 'materials:manage', { entityId }) || can(authUser, 'admin:users:manage', { entityId })
      const hasCancellation = can(authUser, 'starters:read', { entityId })
      const hasStarterCreated = can(authUser, 'starters:read', { entityId })
      const hasEntra = membershipSet.has(entityId) || can(authUser, 'admin:entities:manage', { entityId })

      capabilities[entityId] = {
        tasks: hasTasks,
        materials: hasMaterials,
        cancellation: hasCancellation,
        starterCreated: hasStarterCreated,
        entra: hasEntra,
      }
    }

    return NextResponse.json({ preferences: prefs, capabilities })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

const UpdatePreferenceSchema = z.object({
  entityId: z.string(),
  weeklyReminder: z.boolean().optional(),
  monthlySummary: z.boolean().optional(),
  quarterlySummary: z.boolean().optional(),
  yearlySummary: z.boolean().optional(),
  taskEmails: z.boolean().optional(),
  materialAlerts: z.boolean().optional(),
  starterCancellation: z.boolean().optional(),
  starterCreated: z.boolean().optional(),
  entraAlerts: z.boolean().optional(),
})

// PATCH: Update notificatie voorkeur voor een entiteit
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: ROLE_ASSIGNMENTS_INCLUDE,
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const authUser = toAuthorizedUser(user)

    const body = await req.json()
    const data = UpdatePreferenceSchema.parse(body)

    // Verifieer dat user toegang heeft tot deze entiteit
    const membership = await prisma.membership.findUnique({
      where: {
        userId_entityId: {
          userId: user.id,
          entityId: data.entityId,
        },
      },
    })

    if (!membership && !can(authUser, 'starters:read', { entityId: data.entityId })) {
      return NextResponse.json(
        { error: 'No access to this entity' },
        { status: 403 }
      )
    }

    // Strip operational fields de gebruiker geen capability voor heeft
    const hasTasks = can(authUser, 'tasks:read:assigned', { entityId: data.entityId }) || can(authUser, 'tasks:read', { entityId: data.entityId })
    const hasMaterials = can(authUser, 'materials:manage', { entityId: data.entityId }) || can(authUser, 'admin:users:manage', { entityId: data.entityId })
    const hasCancellation = can(authUser, 'starters:read', { entityId: data.entityId })
    const hasStarterCreated = can(authUser, 'starters:read', { entityId: data.entityId })
    const hasEntra = !!membership || can(authUser, 'admin:entities:manage', { entityId: data.entityId })

    if (!hasTasks) delete (data as any).taskEmails
    if (!hasMaterials) delete (data as any).materialAlerts
    if (!hasCancellation) delete (data as any).starterCancellation
    if (!hasStarterCreated) delete (data as any).starterCreated
    if (!hasEntra) delete (data as any).entraAlerts

    // Update of create preference
    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_entityId: {
          userId: user.id,
          entityId: data.entityId,
        },
      },
      update: {
        ...(data.weeklyReminder !== undefined && { weeklyReminder: data.weeklyReminder }),
        ...(data.monthlySummary !== undefined && { monthlySummary: data.monthlySummary }),
        ...(data.quarterlySummary !== undefined && { quarterlySummary: data.quarterlySummary }),
        ...(data.yearlySummary !== undefined && { yearlySummary: data.yearlySummary }),
        ...(data.taskEmails !== undefined && { taskEmails: data.taskEmails }),
        ...(data.materialAlerts !== undefined && { materialAlerts: data.materialAlerts }),
        ...(data.starterCancellation !== undefined && { starterCancellation: data.starterCancellation }),
        ...(data.starterCreated !== undefined && { starterCreated: data.starterCreated }),
        ...(data.entraAlerts !== undefined && { entraAlerts: data.entraAlerts }),
      },
      create: {
        userId: user.id,
        entityId: data.entityId,
        weeklyReminder: data.weeklyReminder ?? true,
        monthlySummary: data.monthlySummary ?? true,
        quarterlySummary: data.quarterlySummary ?? true,
        yearlySummary: data.yearlySummary ?? true,
        taskEmails: data.taskEmails ?? true,
        materialAlerts: data.materialAlerts ?? true,
        starterCancellation: data.starterCancellation ?? true,
        starterCreated: data.starterCreated ?? true,
        entraAlerts: data.entraAlerts ?? true,
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
      },
    })

    return NextResponse.json(preference)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating notification preference:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preference' },
      { status: 500 }
    )
  }
}
