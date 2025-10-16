import { Role, User, Membership } from '@prisma/client'
import { prisma } from './prisma'

export type UserWithMemberships = User & {
  memberships: (Membership & { entity: { id: string; name: string } })[]
}

/**
 * Controleert of een gebruiker HR_ADMIN is
 */
export function isHRAdmin(user: User): boolean {
  return user.role === 'HR_ADMIN'
}

/**
 * Controleert of een gebruiker GLOBAL_VIEWER is
 */
export function isGlobalViewer(user: User): boolean {
  return user.role === 'GLOBAL_VIEWER'
}

/**
 * Haalt alle entiteit IDs op waar een gebruiker toegang toe heeft
 */
export function getAccessibleEntityIds(user: UserWithMemberships): string[] {
  if (isHRAdmin(user) || isGlobalViewer(user)) {
    return [] // Empty array betekent "alle entiteiten"
  }
  
  return user.memberships.map(m => m.entityId)
}

/**
 * Controleert of een gebruiker een specifieke entiteit kan bewerken
 */
export function canEditEntity(user: UserWithMemberships, entityId: string): boolean {
  if (isHRAdmin(user)) return true
  
  const membership = user.memberships.find(m => m.entityId === entityId)
  return membership?.canEdit ?? false
}

/**
 * Controleert of een gebruiker een specifieke entiteit kan bekijken
 */
export function canViewEntity(user: UserWithMemberships, entityId: string): boolean {
  if (isHRAdmin(user) || isGlobalViewer(user)) return true
  
  return user.memberships.some(m => m.entityId === entityId)
}

/**
 * Haalt alle zichtbare entiteiten op voor een gebruiker
 */
export async function getVisibleEntities(user: UserWithMemberships) {
  if (isHRAdmin(user) || isGlobalViewer(user)) {
    return prisma.entity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }
  
  const entityIds = getAccessibleEntityIds(user)
  return prisma.entity.findMany({
    where: {
      id: { in: entityIds },
      isActive: true,
    },
    orderBy: { name: 'asc' },
  })
}

/**
 * Filtert een where clause voor starters op basis van RBAC
 */
export function filterStartersByRBAC(
  user: UserWithMemberships,
  where: any = {}
): any {
  if (isHRAdmin(user) || isGlobalViewer(user)) {
    return where
  }
  
  const entityIds = getAccessibleEntityIds(user)
  return {
    ...where,
    entityId: { in: entityIds },
  }
}

/**
 * Controleert of een gebruiker admin rechten heeft (voor user/entity management)
 */
export function hasAdminRights(user: User): boolean {
  return user.role === 'HR_ADMIN'
}

/**
 * Valideert of een gebruiker een actie mag uitvoeren op een starter
 */
export async function canMutateStarter(
  user: UserWithMemberships,
  starterId?: string
): Promise<boolean> {
  if (isHRAdmin(user)) return true
  
  // Voor nieuwe starters: check of user editor is van minstens 1 entiteit
  if (!starterId) {
    return user.memberships.some(m => m.canEdit)
  }
  
  // Voor bestaande starters: check of user editor is van de entiteit
  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true },
  })
  
  if (!starter?.entityId) return false
  
  return canEditEntity(user, starter.entityId)
}

