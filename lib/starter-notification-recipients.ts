import { prisma } from '@/lib/prisma'
import { ROLE_ASSIGNMENTS_INCLUDE, toAuthorizedUser, can } from '@/lib/authz'
import { filterByNotificationPreference } from '@/lib/notification-prefs'

export type StarterNotifyRecipient = {
  id: string
  email: string
  name: string | null
}

export type StarterNotifyResolveMeta = {
  eligibleBeforePref: number
  afterPrefFilter: number
  excludedActor: boolean
}

/**
 * Recipients for date-change mail:
 * - any ACTIVE/INVITED user with starters:read on the entity (RBAC)
 * - plus active entity memberships (legacy)
 * - preference starterDateChange not explicitly off
 * - actor excluded
 */
export async function resolveStarterDateChangeRecipients(
  entityId: string,
  excludeUserId: string,
): Promise<{ recipients: StarterNotifyRecipient[]; meta: StarterNotifyResolveMeta }> {
  const byId = new Map<string, StarterNotifyRecipient>()

  // Broad load: all users with any role assignment, then filter with can().
  // Avoids brittle nested permission SQL that can miss valid assignees.
  const roleUsers = await prisma.user.findMany({
    where: {
      status: { in: ['ACTIVE', 'INVITED'] },
      roleAssignments: { some: {} },
    },
    include: ROLE_ASSIGNMENTS_INCLUDE,
  })

  for (const u of roleUsers) {
    if (u.id === excludeUserId || !u.email) continue
    if (!can(toAuthorizedUser(u), 'starters:read', { entityId })) continue
    byId.set(u.id, { id: u.id, email: u.email, name: u.name })
  }

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
    if (!u || u.id === excludeUserId || !u.email) continue
    if (u.status !== 'ACTIVE' && u.status !== 'INVITED') continue
    if (!byId.has(u.id)) {
      byId.set(u.id, { id: u.id, email: u.email, name: u.name })
    }
  }

  const eligible = [...byId.values()]
  const meta: StarterNotifyResolveMeta = {
    eligibleBeforePref: eligible.length,
    afterPrefFilter: eligible.length,
    excludedActor: true,
  }

  if (eligible.length === 0) {
    return { recipients: [], meta }
  }

  try {
    const allowedIds = await filterByNotificationPreference(
      eligible.map((r) => r.id),
      entityId,
      'starterDateChange',
    )
    const allowed = new Set(allowedIds)
    const recipients = eligible.filter((r) => allowed.has(r.id))
    meta.afterPrefFilter = recipients.length
    return { recipients, meta }
  } catch (err) {
    console.warn('starterDateChange pref filter failed, falling back to all eligible:', err)
    return { recipients: eligible, meta }
  }
}
