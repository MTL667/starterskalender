import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Maak default preferences aan voor entiteiten zonder preferences
    const entitiesWithPreferences = new Set(
      user.notificationPreferences.map(p => p.entityId)
    )

    const entitiesToCreate = user.memberships
      .filter(m => !entitiesWithPreferences.has(m.entityId))
      .map(m => m.entityId)

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
            },
          })
        )
      )

      // Haal preferences opnieuw op na aanmaken
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
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
        },
      })

      return NextResponse.json(updatedUser?.notificationPreferences || [])
    }

    return NextResponse.json(user.notificationPreferences)
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
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

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

    // HR_ADMIN heeft toegang tot alle entiteiten
    if (!membership && user.role !== 'HR_ADMIN') {
      return NextResponse.json(
        { error: 'No access to this entity' },
        { status: 403 }
      )
    }

    // Update of create preference
    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_entityId: {
          userId: user.id,
          entityId: data.entityId,
        },
      },
      update: {
        weeklyReminder: data.weeklyReminder,
        monthlySummary: data.monthlySummary,
        quarterlySummary: data.quarterlySummary,
        yearlySummary: data.yearlySummary,
      },
      create: {
        userId: user.id,
        entityId: data.entityId,
        weeklyReminder: data.weeklyReminder ?? true,
        monthlySummary: data.monthlySummary ?? true,
        quarterlySummary: data.quarterlySummary ?? true,
        yearlySummary: data.yearlySummary ?? true,
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

