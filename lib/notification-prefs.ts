import { prisma } from '@/lib/prisma'

type NotifField =
  | 'weeklyReminder'
  | 'monthlySummary'
  | 'quarterlySummary'
  | 'yearlySummary'
  | 'taskEmails'
  | 'materialAlerts'
  | 'starterCancellation'
  | 'starterCreated'
  | 'starterDateChange'
  | 'entraAlerts'

/**
 * Check of een gebruiker een specifieke notificatievoorkeur aanstaat voor een entity.
 * Retourneert true als er geen preference record bestaat (opt-out model).
 */
export async function isNotificationEnabled(
  userId: string,
  entityId: string | null | undefined,
  field: NotifField
): Promise<boolean> {
  if (!entityId) return true

  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_entityId: { userId, entityId } },
    select: { [field]: true },
  })

  if (!pref) return true
  return (pref as Record<string, boolean>)[field] ?? true
}

/**
 * Filter een lijst van user IDs op basis van notification preference.
 * Retourneert alleen user IDs die de notificatie niet hebben uitgeschakeld.
 */
export async function filterByNotificationPreference(
  userIds: string[],
  entityId: string | null | undefined,
  field: NotifField
): Promise<string[]> {
  if (!entityId || userIds.length === 0) return userIds

  const prefs = await prisma.notificationPreference.findMany({
    where: {
      userId: { in: userIds },
      entityId,
    },
    select: { userId: true, [field]: true },
  })

  const prefMap = new Map<string, boolean | undefined>()
  for (const p of prefs) {
    prefMap.set(p.userId, (p as Record<string, any>)[field])
  }

  return userIds.filter(uid => {
    const val = prefMap.get(uid)
    return val === undefined || val === true
  })
}
