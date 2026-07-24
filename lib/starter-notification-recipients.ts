import { prisma } from '@/lib/prisma'
import { ROLE_ASSIGNMENTS_INCLUDE, toAuthorizedUser, can } from '@/lib/authz'
import { filterByNotificationPreference } from '@/lib/notification-prefs'

export type StarterNotifyRecipient = {
  id: string
  email: string
  name: string | null
}

/**
 * Recipients for date-change mail — mirrors cancellation/starterCreated:
 * - users with starters:read on the entity (role-based)
 * - plus active entity memberships
 * Then: preference starterDateChange on, exclude actor.
 */
export async function resolveStarterDateChangeRecipients(
  entityId: string,
  excludeUserId: string,
): Promise<StarterNotifyRecipient[]> {
  const byId = new Map<string, StarterNotifyRecipient>()

  const roleUsers = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      roleAssignments: {
        some: {
          role: {
            permissions: {
              some: { permissionKey: 'starters:read' },
            },
          },
        },
      },
    },
    include: ROLE_ASSIGNMENTS_INCLUDE,
  })

  for (const u of roleUsers) {
    if (u.id === excludeUserId || !u.email) continue
    if (!can(toAuthorizedUser(u), 'starters:read', { entityId })) continue
    byId.set(u.id, { id: u.id, email: u.email, name: u.name })
  }

  // Entity members (same as starterCreated / cancellation broadcasts)
  const memberships = await prisma.membership.findMany({
    where: { entityId },
    include: {
      user: {
        select: { id: true, email: true, name: true, status: true },
      },
    },
  })

  for (const m of memberships) {
    const u = m.user
    if (!u || u.id === excludeUserId || !u.email || u.status !== 'ACTIVE') continue
    if (!byId.has(u.id)) {
      byId.set(u.id, { id: u.id, email: u.email, name: u.name })
    }
  }

  const eligible = [...byId.values()]
  if (eligible.length === 0) return []

  try {
    const allowedIds = await filterByNotificationPreference(
      eligible.map((r) => r.id),
      entityId,
      'starterDateChange',
    )
    const allowed = new Set(allowedIds)
    return eligible.filter((r) => allowed.has(r.id))
  } catch (err) {
    // Column not migrated yet, or prefs query failed — opt-in default
    console.warn('starterDateChange pref filter failed, falling back to all eligible:', err)
    return eligible
  }
}
