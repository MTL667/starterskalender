import { prisma } from '@/lib/prisma'
import { ROLE_ASSIGNMENTS_INCLUDE, toAuthorizedUser, can } from '@/lib/authz'
import { filterByNotificationPreference } from '@/lib/notification-prefs'

export type StarterNotifyRecipient = {
  id: string
  email: string
  name: string | null
}

/**
 * Users with starters:read on the entity, preference enabled, excluding the actor.
 */
export async function resolveStarterDateChangeRecipients(
  entityId: string,
  excludeUserId: string,
): Promise<StarterNotifyRecipient[]> {
  const candidates = await prisma.user.findMany({
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

  const eligible: StarterNotifyRecipient[] = []
  for (const u of candidates) {
    if (u.id === excludeUserId) continue
    if (!u.email) continue
    const authUser = toAuthorizedUser(u)
    if (!can(authUser, 'starters:read', { entityId })) continue
    eligible.push({ id: u.id, email: u.email, name: u.name })
  }

  if (eligible.length === 0) return []

  const allowedIds = await filterByNotificationPreference(
    eligible.map((r) => r.id),
    entityId,
    'starterDateChange',
  )
  const allowed = new Set(allowedIds)
  return eligible.filter((r) => allowed.has(r.id))
}
