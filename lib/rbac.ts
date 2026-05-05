/**
 * RBAC helpers — delegeren naar `lib/authz` (RBAC v2) wanneer de user
 * actieve roleAssignments heeft. Zonder assignments valt de code terug op
 * legacy kolommen (`legacyRole`, `legacyPermissions`) zodat gebruikers
 * die nog niet gebackfilled zijn blijven werken.
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

export type UserWithMemberships = User & {
  role: LegacyRole
  memberships: (Membership & { entity: { id: string; name: string } })[]
  roleAssignments?: any[]
}

function hasV2Roles(user: { roleAssignments?: any[] }): boolean {
  return Array.isArray(user.roleAssignments) && user.roleAssignments.length > 0
}

async function asAuthUser(user: UserWithMemberships): Promise<AuthorizedUser> {
  if (hasV2Roles(user)) return toAuthorizedUser(user)
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

function asAuthUserSync(user: UserWithMemberships): AuthorizedUser {
  return toAuthorizedUser({
    ...user,
    roleAssignments: (user.roleAssignments as LoadedRoleAssignment[] | undefined) ?? [],
  })
}

export function isHRAdmin(user: User & { role?: LegacyRole; legacyRole?: LegacyRole; roleAssignments?: any[] }): boolean {
  if (hasV2Roles(user as any)) {
    return can(toAuthorizedUser(user as any), 'admin:users:manage')
  }
  const role = (user as any).role ?? user.legacyRole
  return role === 'HR_ADMIN'
}

export function hasPermission(
  user: User & { permissions?: string[]; legacyPermissions?: string[]; roleAssignments?: any[] },
  permission: Permission,
): boolean {
  if (hasV2Roles(user as any)) {
    const authUser = toAuthorizedUser(user as any)
    if (permission === 'MATERIAL_MANAGER') return can(authUser, 'materials:manage')
    return can(authUser, 'admin:users:manage')
  }
  if (isHRAdmin(user)) return true
  const perms = (user as any).permissions ?? user.legacyPermissions ?? []
  return perms.includes(permission)
}

export function isMaterialManager(user: User & any): boolean {
  if (hasV2Roles(user)) {
    return can(toAuthorizedUser(user), 'materials:manage')
  }
  return hasPermission(user, 'MATERIAL_MANAGER')
}

export function isGlobalViewer(user: User & { role?: LegacyRole; legacyRole?: LegacyRole; roleAssignments?: any[] }): boolean {
  if (hasV2Roles(user as any)) {
    const authUser = toAuthorizedUser(user as any)
    return visibleEntityIds(authUser, 'starters:read') === 'ALL' && !can(authUser, 'admin:users:manage')
  }
  const role = (user as any).role ?? user.legacyRole
  return role === 'GLOBAL_VIEWER'
}

export function getAccessibleEntityIds(user: UserWithMemberships): string[] {
  const authUser = asAuthUserSync(user)
  const scope = visibleEntityIds(authUser, 'starters:read')
  if (scope === 'ALL') return []
  return scope
}

export function canEditEntity(user: UserWithMemberships, entityId: string): boolean {
  return can(asAuthUserSync(user), 'starters:update', { entityId })
}

export function canViewEntity(user: UserWithMemberships, entityId: string): boolean {
  return can(asAuthUserSync(user), 'starters:read', { entityId })
}

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

export function filterStartersByRBAC(
  user: UserWithMemberships,
  where: any = {},
): any {
  const scope = visibleEntityIds(asAuthUserSync(user), 'starters:read')
  if (scope === 'ALL') return where
  return { ...where, entityId: { in: scope } }
}

export function hasAdminRights(user: User & { role?: LegacyRole; legacyRole?: LegacyRole; roleAssignments?: any[] }): boolean {
  return isHRAdmin(user)
}

export async function canMutateStarter(
  user: UserWithMemberships,
  starterId?: string,
): Promise<boolean> {
  const authUser = await asAuthUser(user)
  if (!starterId) {
    return can(authUser, 'starters:create')
  }
  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true },
  })
  if (!starter?.entityId) return false
  return can(authUser, 'starters:update', { entityId: starter.entityId })
}
