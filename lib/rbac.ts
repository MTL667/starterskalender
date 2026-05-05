/**
 * RBAC helpers — delegeren volledig naar `lib/authz` (RBAC v2).
 * Legacy fallback-logica is verwijderd: alle users worden verwacht
 * via UserRoleAssignment hun rechten te hebben.
 */

import { User, Membership } from '@prisma/client'
import { prisma } from './prisma'
import {
  can,
  visibleEntityIds,
  toAuthorizedUser,
  type AuthorizedUser,
  type LoadedRoleAssignment,
} from './authz'

export type UserWithMemberships = User & {
  memberships: (Membership & { entity: { id: string; name: string } })[]
  roleAssignments?: any[]
}

function asAuthUserSync(user: UserWithMemberships): AuthorizedUser {
  return toAuthorizedUser({
    ...user,
    roleAssignments: (user.roleAssignments as LoadedRoleAssignment[] | undefined) ?? [],
  })
}

async function asAuthUser(user: UserWithMemberships): Promise<AuthorizedUser> {
  if (Array.isArray(user.roleAssignments) && user.roleAssignments.length > 0) {
    return toAuthorizedUser(user)
  }
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

export function isHRAdmin(user: User & { roleAssignments?: any[] }): boolean {
  return can(toAuthorizedUser(user as any), 'admin:users:manage')
}

export function hasPermission(
  user: User & { roleAssignments?: any[] },
  permission: string,
): boolean {
  const authUser = toAuthorizedUser(user as any)
  if (permission === 'MATERIAL_MANAGER') return can(authUser, 'materials:manage')
  return can(authUser, 'admin:users:manage')
}

export function isMaterialManager(user: User & { roleAssignments?: any[] }): boolean {
  return can(toAuthorizedUser(user as any), 'materials:manage')
}

export function isGlobalViewer(user: User & { roleAssignments?: any[] }): boolean {
  const authUser = toAuthorizedUser(user as any)
  return visibleEntityIds(authUser, 'starters:read') === 'ALL' && !can(authUser, 'admin:users:manage')
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

export function hasAdminRights(user: User & { roleAssignments?: any[] }): boolean {
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
