import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth-options'
import { prisma } from './prisma'
import { UserWithMemberships } from './rbac'

/**
 * Haalt de huidige gebruiker op met memberships
 */
export async function getCurrentUser(): Promise<UserWithMemberships | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return null
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          entity: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })
  
  return user
}

/**
 * Vereist dat de gebruiker is ingelogd EN een actieve rol heeft (niet NONE)
 * NONE users worden geblokkeerd van alle data/acties
 */
export async function requireAuth(): Promise<UserWithMemberships> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized: Not logged in')
  }
  
  // Block NONE users - they have no permissions until admin grants them
  if (user.role === 'NONE') {
    throw new Error('Forbidden: Your account is pending approval. Contact an administrator.')
  }
  
  return user
}

/**
 * Vereist dat de gebruiker HR_ADMIN is
 */
export async function requireAdmin(): Promise<UserWithMemberships> {
  const user = await requireAuth()
  
  if (user.role !== 'HR_ADMIN') {
    throw new Error('Forbidden: Admin rights required')
  }
  
  return user
}

/**
 * Vereist dat de gebruiker minimaal GLOBAL_VIEWER is (kan alle data zien)
 */
export async function requireGlobalViewer(): Promise<UserWithMemberships> {
  const user = await requireAuth()
  
  if (user.role !== 'HR_ADMIN' && user.role !== 'GLOBAL_VIEWER') {
    throw new Error('Forbidden: Global viewer rights required')
  }
  
  return user
}

/**
 * Check of gebruiker toegang heeft tot een specifieke entiteit
 * - HR_ADMIN: altijd toegang
 * - GLOBAL_VIEWER: altijd toegang (read-only)
 * - ENTITY_VIEWER/EDITOR: alleen toegang tot eigen entiteiten
 */
export async function hasEntityAccess(
  user: UserWithMemberships,
  entityId: string,
  requireEdit: boolean = false
): Promise<boolean> {
  // HR_ADMIN heeft altijd toegang
  if (user.role === 'HR_ADMIN') {
    return true
  }
  
  // GLOBAL_VIEWER heeft altijd read toegang
  if (user.role === 'GLOBAL_VIEWER' && !requireEdit) {
    return true
  }
  
  // Check memberships
  const membership = user.memberships.find(m => m.entityId === entityId)
  
  if (!membership) {
    return false
  }
  
  // Als edit vereist is, check canEdit
  if (requireEdit && !membership.canEdit) {
    return false
  }
  
  return true
}

/**
 * Vereist toegang tot een specifieke entiteit
 */
export async function requireEntityAccess(
  entityId: string,
  requireEdit: boolean = false
): Promise<UserWithMemberships> {
  const user = await requireAuth()
  
  const hasAccess = await hasEntityAccess(user, entityId, requireEdit)
  
  if (!hasAccess) {
    throw new Error(
      requireEdit 
        ? 'Forbidden: You do not have edit rights for this entity'
        : 'Forbidden: You do not have access to this entity'
    )
  }
  
  return user
}
