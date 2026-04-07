import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/users/[id]/notification-preferences
 * 
 * Haal notificatievoorkeuren op voor een specifieke user.
 * Maakt automatisch ontbrekende rijen aan voor toegankelijke entiteiten.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        notificationPreferences: {
          include: {
            entity: {
              select: { id: true, name: true, colorHex: true },
            },
          },
        },
        memberships: {
          select: { entityId: true },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Bepaal welke entiteiten deze user zou moeten zien
    let accessibleEntityIds: string[]

    if (targetUser.role === 'HR_ADMIN' || targetUser.role === 'GLOBAL_VIEWER') {
      const allEntities = await prisma.entity.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      accessibleEntityIds = allEntities.map(e => e.id)
    } else {
      accessibleEntityIds = targetUser.memberships.map(m => m.entityId)
    }

    // Maak ontbrekende preference rijen aan
    const existingEntityIds = new Set(
      targetUser.notificationPreferences.map(p => p.entityId)
    )
    const entitiesToCreate = accessibleEntityIds.filter(
      eid => !existingEntityIds.has(eid)
    )

    if (entitiesToCreate.length > 0) {
      await Promise.all(
        entitiesToCreate.map(entityId =>
          prisma.notificationPreference.create({
            data: {
              userId: targetUser.id,
              entityId,
              weeklyReminder: true,
              monthlySummary: true,
              quarterlySummary: true,
              yearlySummary: true,
            },
          })
        )
      )
    }

    // Haal bijgewerkte preferences op
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: targetUser.id,
        entityId: { in: accessibleEntityIds },
      },
      include: {
        entity: {
          select: { id: true, name: true, colorHex: true },
        },
      },
      orderBy: { entity: { name: 'asc' } },
    })

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error fetching user notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const BulkUpdateSchema = z.object({
  preferences: z.array(
    z.object({
      entityId: z.string(),
      weeklyReminder: z.boolean(),
      monthlySummary: z.boolean(),
      quarterlySummary: z.boolean(),
      yearlySummary: z.boolean(),
    })
  ),
})

/**
 * PATCH /api/admin/users/[id]/notification-preferences
 * 
 * Bulk update notificatievoorkeuren voor een specifieke user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { preferences } = BulkUpdateSchema.parse(body)

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { memberships: { select: { entityId: true } } },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Bepaal toegankelijke entiteiten
    let accessibleEntityIds: Set<string>

    if (targetUser.role === 'HR_ADMIN' || targetUser.role === 'GLOBAL_VIEWER') {
      const allEntities = await prisma.entity.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      accessibleEntityIds = new Set(allEntities.map(e => e.id))
    } else {
      accessibleEntityIds = new Set(targetUser.memberships.map(m => m.entityId))
    }

    // Filter preferences tot alleen toegankelijke entiteiten
    const validPreferences = preferences.filter(p =>
      accessibleEntityIds.has(p.entityId)
    )

    // Bulk upsert
    await Promise.all(
      validPreferences.map(pref =>
        prisma.notificationPreference.upsert({
          where: {
            userId_entityId: {
              userId: id,
              entityId: pref.entityId,
            },
          },
          update: {
            weeklyReminder: pref.weeklyReminder,
            monthlySummary: pref.monthlySummary,
            quarterlySummary: pref.quarterlySummary,
            yearlySummary: pref.yearlySummary,
          },
          create: {
            userId: id,
            entityId: pref.entityId,
            weeklyReminder: pref.weeklyReminder,
            monthlySummary: pref.monthlySummary,
            quarterlySummary: pref.quarterlySummary,
            yearlySummary: pref.yearlySummary,
          },
        })
      )
    )

    return NextResponse.json({ success: true, updated: validPreferences.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating user notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
