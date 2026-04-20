/**
 * Sync-helpers tussen het legacy rol-systeem (`User.legacyRole` + `Membership`
 * + `User.legacyPermissions`) en het nieuwe RBAC v2 (`UserRoleAssignment`).
 *
 * Wordt gebruikt door admin-API routes die de oude kolommen updaten, zodat de
 * nieuwe `can()`-checks altijd in sync blijven zolang de oude UI nog
 * bestaat. Na cutover (oude kolommen gedropt) kan dit bestand verdwijnen.
 */

import { prisma } from './prisma'

const ROLE_KEY = {
  HR_ADMIN: 'hr-admin',
  GLOBAL_VIEWER: 'global-viewer',
  ENTITY_EDITOR: 'entity-editor',
  ENTITY_VIEWER: 'entity-viewer',
  MATERIAL_MANAGER: 'material-manager',
} as const

async function roleIdMap(): Promise<Map<string, string>> {
  const roles = await prisma.role.findMany({
    where: { isSystem: true },
    select: { id: true, key: true },
  })
  return new Map(roles.map((r) => [r.key, r.id]))
}

/**
 * Herbouw de `UserRoleAssignment`s voor één user op basis van zijn huidige
 * `legacyRole`, `legacyPermissions` en `Membership`-records. Verwijdert
 * system-role assignments die niet meer matchen en voegt nieuwe toe.
 * Laat custom (niet-system) rollen met rust.
 */
export async function syncLegacyRoleToAssignments(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { select: { entityId: true, canEdit: true } } },
  })
  if (!user) return

  const roleIds = await roleIdMap()
  const systemRoleIds = new Set(roleIds.values())

  const edit = user.memberships.filter((m) => m.canEdit).map((m) => m.entityId)
  const view = user.memberships.filter((m) => !m.canEdit).map((m) => m.entityId)
  const all = user.memberships.map((m) => m.entityId)

  // Bouw de gewenste set system-role-assignments op
  const desired: { roleKey: string; entityIds: string[] }[] = []
  switch (user.legacyRole) {
    case 'HR_ADMIN':
      desired.push({ roleKey: ROLE_KEY.HR_ADMIN, entityIds: [] })
      break
    case 'GLOBAL_VIEWER':
      desired.push({ roleKey: ROLE_KEY.GLOBAL_VIEWER, entityIds: [] })
      break
    case 'ENTITY_EDITOR':
      if (edit.length > 0) desired.push({ roleKey: ROLE_KEY.ENTITY_EDITOR, entityIds: edit })
      if (view.length > 0) desired.push({ roleKey: ROLE_KEY.ENTITY_VIEWER, entityIds: view })
      break
    case 'ENTITY_VIEWER':
      if (all.length > 0) desired.push({ roleKey: ROLE_KEY.ENTITY_VIEWER, entityIds: all })
      break
    case 'NONE':
      // Geen system-rol-toekenningen
      break
  }
  if (user.legacyPermissions.includes('MATERIAL_MANAGER')) {
    desired.push({ roleKey: ROLE_KEY.MATERIAL_MANAGER, entityIds: [] })
  }

  const desiredByRoleId = new Map<string, string[]>()
  for (const { roleKey, entityIds } of desired) {
    const rid = roleIds.get(roleKey)
    if (rid) desiredByRoleId.set(rid, entityIds)
  }

  const existing = await prisma.userRoleAssignment.findMany({
    where: { userId },
    include: { role: { select: { isSystem: true } } },
  })

  // Remove system-role assignments that are no longer desired
  for (const ra of existing) {
    if (!ra.role.isSystem) continue
    if (!systemRoleIds.has(ra.roleId)) continue
    if (!desiredByRoleId.has(ra.roleId)) {
      await prisma.userRoleAssignment.delete({ where: { id: ra.id } })
    }
  }

  // Upsert desired assignments with exact entityIds
  for (const [roleId, entityIds] of desiredByRoleId) {
    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId, entityIds },
      update: { entityIds },
    })
  }
}

/**
 * Sync voor een lijst users (bv. bulk-operatie, membership-wijziging).
 */
export async function syncLegacyRoleToAssignmentsBulk(userIds: string[]): Promise<void> {
  for (const id of userIds) {
    await syncLegacyRoleToAssignments(id)
  }
}
