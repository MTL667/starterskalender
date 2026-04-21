/**
 * Legacy RBAC helpers — delegeren nu intern naar het nieuwe `lib/authz` systeem.
 *
 * Alle signatures blijven identiek zodat bestaande call-sites blijven werken
 * zonder aanpassingen. Nieuwe code gebruikt bij voorkeur rechtstreeks
 * `can()` / `require()` uit `lib/authz.ts`.
 *
 * Wordt verwijderd na cutover wanneer alle call-sites gemigreerd zijn.
 */

import { User, Membership, LegacyRole } from '@prisma/client'
import { prisma } from './prisma'
import {
  can,
  visibleEntityIds,
  toAuthorizedUser,
  type AuthorizedUser,
  type LoadedRoleAssignment,
} from './authz'

export type Permission = 'MATERIAL_MANAGER'

/**
 * Prisma-user met memberships + (nieuw) roleAssignments. Het `role`-veld blijft
 * beschikbaar als alias op `legacyRole` zodat bestaande code keep werkt.
 */
export type UserWithMemberships = User & {
  role: LegacyRole // alias voor legacyRole, zie lib/auth-utils.ts#getCurrentUser
  memberships: (Membership & { entity: { id: string; name: string } })[]
  roleAssignments?: any[] // Eager-geladen in getCurrentUser; mag ontbreken in mock-tests
}

/**
 * Converteer een legacy user naar het AuthorizedUser formaat van `lib/authz`.
 * Als de user geen roleAssignments draagt (bv. oude mocks), vallen we terug op
 * een on-the-fly query voor backwards-compat met bestaande tests.
 */
async function asAuthUser(user: UserWithMemberships): Promise<AuthorizedUser> {
  if (user.roleAssignments) return toAuthorizedUser(user)
  // Backwards-compat: roleAssignments niet geladen → haal ze 1× op.
  const loaded = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      roleAssignments: {
        include: {
          role: { include: { permissions: { select: { permissionKey: true } } } },
        },
      },
    },
  })
  return toAuthorizedUser({ ...user, roleAssignments: loaded?.roleAssignments ?? [] })
}

/** Synchrone variant voor pure mocks zonder DB-toegang (tests). */
function asAuthUserSync(user: UserWithMemberships): AuthorizedUser {
  return toAuthorizedUser({
    ...user,
    roleAssignments: (user.roleAssignments as LoadedRoleAssignment[] | undefined) ?? [],
  })
}

/**
 * Controleert of een gebruiker HR_ADMIN is.
 * @deprecated Gebruik `can(user, 'admin:users:manage')`.
 */
export function isHRAdmin(user: User & { role?: LegacyRole; legacyRole?: LegacyRole }): boolean {
  const role = (user as any).role ?? user.legacyRole
  return role === 'HR_ADMIN'
}

/**
 * Controleert of een gebruiker een specifieke permission heeft.
 * @deprecated Gebruik `can(user, '<permission-key>')`.
 */
export function hasPermission(
  user: User & { permissions?: string[]; legacyPermissions?: string[] },
  permission: Permission,
): boolean {
  if (isHRAdmin(user)) return true
  const perms = (user as any).permissions ?? user.legacyPermissions ?? []
  return perms.includes(permission)
}

/**
 * Controleert of een gebruiker materiaalbeheerder is.
 * @deprecated Gebruik `can(user, 'materials:manage')`.
 */
export function isMaterialManager(user: User & any): boolean {
  return hasPermission(user, 'MATERIAL_MANAGER')
}

/**
 * Controleert of een gebruiker GLOBAL_VIEWER is.
 * @deprecated Scope wordt nu bepaald door `visibleEntityIds(user, 'starters:read') === 'ALL'`.
 */
export function isGlobalViewer(user: User & { role?: LegacyRole; legacyRole?: LegacyRole }): boolean {
  const role = (user as any).role ?? user.legacyRole
  return role === 'GLOBAL_VIEWER'
}

/**
 * Haalt alle entiteit IDs op waar een gebruiker toegang toe heeft.
 * Leeg = "alle entiteiten" (wordt later gefilterd in Prisma where).
 */
export function getAccessibleEntityIds(user: UserWithMemberships): string[] {
  if (isHRAdmin(user) || isGlobalViewer(user)) {
    return [] // Empty array betekent "alle entiteiten"
  }
  return user.memberships.map(m => m.entityId)
}

/**
 * Controleert of een gebruiker een specifieke entiteit kan bewerken.
 * Delegatie naar `can('starters:update', { entityId })` indien roleAssignments beschikbaar.
 */
export function canEditEntity(user: UserWithMemberships, entityId: string): boolean {
  if (user.roleAssignments && user.roleAssignments.length > 0) {
    return can(asAuthUserSync(user), 'starters:update', { entityId })
  }
  if (isHRAdmin(user)) return true
  const membership = user.memberships.find(m => m.entityId === entityId)
  return membership?.canEdit ?? false
}

/**
 * Controleert of een gebruiker een specifieke entiteit kan bekijken.
 */
export function canViewEntity(user: UserWithMemberships, entityId: string): boolean {
  if (user.roleAssignments && user.roleAssignments.length > 0) {
    return can(asAuthUserSync(user), 'starters:read', { entityId })
  }
  if (isHRAdmin(user) || isGlobalViewer(user)) return true
  return user.memberships.some(m => m.entityId === entityId)
}

/**
 * Haalt alle zichtbare entiteiten op voor een gebruiker.
 */
export async function getVisibleEntities(user: UserWithMemberships) {
  const authUser = await asAuthUser(user)
  const scope = visibleEntityIds(authUser, 'starters:read')
  if (scope === 'ALL') {
    return prisma.entity.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  }
  return prisma.entity.findMany({
    where: { id: { in: scope }, isActive: true },
    orderBy: { name: 'asc' },
  })
}

/**
 * Filtert een where clause voor starters op basis van RBAC.
 */
export function filterStartersByRBAC(
  user: UserWithMemberships,
  where: any = {},
): any {
  if (user.roleAssignments && user.roleAssignments.length > 0) {
    const scope = visibleEntityIds(asAuthUserSync(user), 'starters:read')
    if (scope === 'ALL') return where
    return { ...where, entityId: { in: scope } }
  }
  if (isHRAdmin(user) || isGlobalViewer(user)) return where
  return { ...where, entityId: { in: getAccessibleEntityIds(user) } }
}

/**
 * Controleert of een gebruiker admin rechten heeft.
 * @deprecated Gebruik `can(user, 'admin:users:manage')`.
 */
export function hasAdminRights(user: User & { role?: LegacyRole; legacyRole?: LegacyRole }): boolean {
  return isHRAdmin(user)
}

/**
 * Valideert of een gebruiker een actie mag uitvoeren op een starter.
 */
export async function canMutateStarter(
  user: UserWithMemberships,
  starterId?: string,
): Promise<boolean> {
  const authUser = await asAuthUser(user)

  // Nieuwe starter: check globaal `starters:create`
  if (!starterId) {
    return can(authUser, 'starters:create')
  }

  // Bestaande starter: check edit-rechten op diens entiteit
  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true },
  })
  if (!starter?.entityId) return false
  return can(authUser, 'starters:update', { entityId: starter.entityId })
}
