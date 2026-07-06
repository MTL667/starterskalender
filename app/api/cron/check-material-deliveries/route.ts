import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/cron-auth'
import { filterByNotificationPreference } from '@/lib/notification-prefs'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  try {
    const overdue = await prisma.starterMaterial.findMany({
      where: {
        status: 'ORDERED',
        expectedDeliveryDate: { lt: new Date() },
        starter: { isCancelled: false },
      },
      include: {
        material: { select: { name: true } },
        starter: {
          select: {
            firstName: true,
            lastName: true,
            entityId: true,
          },
        },
      },
    })

    if (overdue.length === 0) {
      return NextResponse.json({ message: 'No overdue materials', count: 0 })
    }

    const materialManagers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roleAssignments: {
          some: {
            role: {
              permissions: { some: { permissionKey: 'materials:manage' } },
            },
          },
        },
      },
      select: { id: true },
    })

    const hrAdmins = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roleAssignments: {
          some: {
            role: {
              permissions: { some: { permissionKey: 'admin:users:manage' } },
            },
          },
        },
      },
      select: { id: true },
    })

    let recipientIds = [...new Set([
      ...materialManagers.map(u => u.id),
      ...hrAdmins.map(u => u.id),
    ])]

    // Filter op basis van notification preferences per entity
    const entityIds = [...new Set(overdue.map(m => m.starter.entityId).filter(Boolean))] as string[]
    if (entityIds.length > 0) {
      const allowedPerEntity = await Promise.all(
        entityIds.map(eid => filterByNotificationPreference(recipientIds, eid, 'materialAlerts'))
      )
      // Gebruiker moet voor minstens één betrokken entity opt-in hebben
      const allowedIntersection = recipientIds.filter(uid =>
        allowedPerEntity.some(set => set.includes(uid))
      )
      recipientIds = allowedIntersection
    }

    const itemSummary = overdue
      .map(m => `${m.material.name} — ${m.starter.firstName} ${m.starter.lastName}`)
      .slice(0, 10)
      .join(', ')

    const suffix = overdue.length > 10 ? ` en ${overdue.length - 10} meer` : ''

    for (const userId of recipientIds) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'MATERIAL_OVERDUE',
          title: `${overdue.length} materialen met verlopen leverdatum`,
          message: `De volgende bestellingen hadden al geleverd moeten zijn: ${itemSummary}${suffix}`,
          linkUrl: '/materialen?overdue=1',
        },
      })
    }

    return NextResponse.json({
      message: `Notified ${recipientIds.length} users about ${overdue.length} overdue materials`,
      overdueCount: overdue.length,
      notifiedUsers: recipientIds.length,
    })
  } catch (error) {
    console.error('Error checking material deliveries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
