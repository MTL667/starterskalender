/**
 * Backfill script — migreert bestaande users van het oude rol-systeem
 * (`User.legacyRole` + `Membership` + `User.legacyPermissions`) naar
 * `UserRoleAssignment`.
 *
 * Mapping:
 *   legacyRole = HR_ADMIN           → UserRoleAssignment(hr-admin, entityIds=[])
 *   legacyRole = GLOBAL_VIEWER      → UserRoleAssignment(global-viewer, entityIds=[])
 *   legacyRole = ENTITY_EDITOR      → UserRoleAssignment(entity-editor, entityIds=[mships where canEdit])
 *                                   + UserRoleAssignment(entity-viewer, entityIds=[mships where !canEdit])
 *   legacyRole = ENTITY_VIEWER      → UserRoleAssignment(entity-viewer, entityIds=[all mships])
 *   legacyRole = NONE               → geen toekenning
 *
 * Extra permissions:
 *   legacyPermissions bevat "MATERIAL_MANAGER" → + UserRoleAssignment(material-manager, entityIds=[])
 *
 * Idempotent: bestaande toekenningen worden niet gedupliceerd dankzij de
 * @@unique([userId, roleId]). Run meerdere keren is safe.
 *
 * Run: `npx tsx prisma/backfill-rbac.ts`
 */

import { PrismaClient, LegacyRole } from '@prisma/client'

const prisma = new PrismaClient()

const ROLE_KEY = {
  HR_ADMIN: 'hr-admin',
  GLOBAL_VIEWER: 'global-viewer',
  ENTITY_EDITOR: 'entity-editor',
  ENTITY_VIEWER: 'entity-viewer',
  MATERIAL_MANAGER: 'material-manager',
} as const

async function loadRoleIdMap() {
  const roles = await prisma.role.findMany({
    where: { isSystem: true },
    select: { id: true, key: true },
  })
  const map = new Map<string, string>(roles.map((r) => [r.key, r.id]))
  for (const key of Object.values(ROLE_KEY)) {
    if (!map.has(key)) {
      throw new Error(`System role "${key}" ontbreekt — run eerst \`npm run db:seed-rbac\``)
    }
  }
  return map
}

async function upsertAssignment(
  userId: string,
  roleId: string,
  entityIds: string[],
) {
  // Merge entityIds als er al een toekenning is — union voorkomt info-verlies
  // als backfill meerdere keren draait na schema-wijzigingen.
  const existing = await prisma.userRoleAssignment.findUnique({
    where: { userId_roleId: { userId, roleId } },
  })
  if (!existing) {
    await prisma.userRoleAssignment.create({
      data: { userId, roleId, entityIds },
    })
    return 'created'
  }
  const merged = [...new Set([...existing.entityIds, ...entityIds])]
  const changed =
    merged.length !== existing.entityIds.length ||
    merged.some((id) => !existing.entityIds.includes(id))
  if (changed) {
    await prisma.userRoleAssignment.update({
      where: { id: existing.id },
      data: { entityIds: merged },
    })
    return 'updated'
  }
  return 'unchanged'
}

async function backfillUser(
  user: {
    id: string
    email: string
    legacyRole: LegacyRole
    legacyPermissions: string[]
    memberships: { entityId: string; canEdit: boolean }[]
  },
  roleId: Map<string, string>,
) {
  const actions: string[] = []

  const editableEntityIds = user.memberships.filter((m) => m.canEdit).map((m) => m.entityId)
  const viewableEntityIds = user.memberships.filter((m) => !m.canEdit).map((m) => m.entityId)
  const allEntityIds = user.memberships.map((m) => m.entityId)

  switch (user.legacyRole) {
    case 'HR_ADMIN':
      actions.push(`${ROLE_KEY.HR_ADMIN} globaal`)
      await upsertAssignment(user.id, roleId.get(ROLE_KEY.HR_ADMIN)!, [])
      break

    case 'GLOBAL_VIEWER':
      actions.push(`${ROLE_KEY.GLOBAL_VIEWER} globaal`)
      await upsertAssignment(user.id, roleId.get(ROLE_KEY.GLOBAL_VIEWER)!, [])
      break

    case 'ENTITY_EDITOR':
      if (editableEntityIds.length > 0) {
        actions.push(`${ROLE_KEY.ENTITY_EDITOR} [${editableEntityIds.length}]`)
        await upsertAssignment(user.id, roleId.get(ROLE_KEY.ENTITY_EDITOR)!, editableEntityIds)
      }
      if (viewableEntityIds.length > 0) {
        actions.push(`${ROLE_KEY.ENTITY_VIEWER} [${viewableEntityIds.length}]`)
        await upsertAssignment(user.id, roleId.get(ROLE_KEY.ENTITY_VIEWER)!, viewableEntityIds)
      }
      break

    case 'ENTITY_VIEWER':
      if (allEntityIds.length > 0) {
        actions.push(`${ROLE_KEY.ENTITY_VIEWER} [${allEntityIds.length}]`)
        await upsertAssignment(user.id, roleId.get(ROLE_KEY.ENTITY_VIEWER)!, allEntityIds)
      }
      break

    case 'NONE':
      // Geen toekenning — user blijft "pending"
      break
  }

  // Extra: MATERIAL_MANAGER permission
  if (user.legacyPermissions.includes('MATERIAL_MANAGER')) {
    actions.push(`${ROLE_KEY.MATERIAL_MANAGER} globaal`)
    await upsertAssignment(user.id, roleId.get(ROLE_KEY.MATERIAL_MANAGER)!, [])
  }

  return actions
}

async function main() {
  console.log('\n═══ RBAC v2 backfill ═══\n')
  const roleId = await loadRoleIdMap()

  const users = await prisma.user.findMany({
    include: { memberships: { select: { entityId: true, canEdit: true } } },
  })

  console.log(`→ Backfill voor ${users.length} users\n`)

  let withRoles = 0
  let without = 0
  for (const user of users) {
    const actions = await backfillUser(user, roleId)
    const label = `${user.email.padEnd(40)} legacyRole=${user.legacyRole.padEnd(14)}`
    if (actions.length > 0) {
      console.log(`  ${label} → ${actions.join(', ')}`)
      withRoles++
    } else {
      console.log(`  ${label} → (geen toekenning)`)
      without++
    }
  }

  console.log(`\n✔ Backfill klaar: ${withRoles} users met rollen, ${without} zonder.\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
