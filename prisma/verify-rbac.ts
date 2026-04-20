/**
 * Verificatie-script — vergelijkt per user de effectieve rechten onder het
 * oude systeem (`legacyRole` + `Membership` + `legacyPermissions`) met de
 * nieuwe situatie onder RBAC v2.
 *
 * Werkt enkel als je al `db:seed-rbac` en `backfill-rbac` hebt gedraaid.
 * Output toont per user:
 *   - Wat kan hij vandaag (legacy)
 *   - Wat kan hij na migratie (authz)
 *   - Eventuele divergenties (MUST be empty voor merge)
 *
 * Run: `npx tsx prisma/verify-rbac.ts`
 */

import { PrismaClient } from '@prisma/client'
import { toAuthorizedUser, can, visibleEntityIds } from '../lib/authz'

const prisma = new PrismaClient()

interface LegacyUser {
  id: string
  email: string
  legacyRole: string
  legacyPermissions: string[]
  memberships: { entityId: string; canEdit: boolean }[]
}

interface AllEntities {
  entityIds: string[]
}

// Representatieve test-cases: dit moeten de nieuwe permissions minstens
// net zo goed antwoorden als de legacy helpers.
const TEST_CASES: {
  label: string
  permission: string
  legacyCheck: (u: LegacyUser, ctx: AllEntities) => boolean | { allowedEntityIds: 'ALL' | string[] }
}[] = [
  {
    label: 'Admin-rechten (user management)',
    permission: 'admin:users:manage',
    legacyCheck: (u) => u.legacyRole === 'HR_ADMIN',
  },
  {
    label: 'Materiaal beheren',
    permission: 'materials:manage',
    legacyCheck: (u) =>
      u.legacyRole === 'HR_ADMIN' || u.legacyPermissions.includes('MATERIAL_MANAGER'),
  },
  {
    label: 'Starters lezen — welke entities?',
    permission: 'starters:read',
    legacyCheck: (u, { entityIds }) => {
      if (u.legacyRole === 'HR_ADMIN' || u.legacyRole === 'GLOBAL_VIEWER') {
        return { allowedEntityIds: 'ALL' as const }
      }
      if (u.legacyRole === 'NONE') return { allowedEntityIds: [] }
      return { allowedEntityIds: u.memberships.map((m) => m.entityId) }
    },
  },
  {
    label: 'Starters bewerken — welke entities?',
    permission: 'starters:update',
    legacyCheck: (u) => {
      if (u.legacyRole === 'HR_ADMIN') return { allowedEntityIds: 'ALL' as const }
      if (u.legacyRole === 'ENTITY_EDITOR') {
        return { allowedEntityIds: u.memberships.filter((m) => m.canEdit).map((m) => m.entityId) }
      }
      return { allowedEntityIds: [] }
    },
  },
  {
    label: 'Taken lezen — welke entities?',
    permission: 'tasks:read',
    legacyCheck: (u) => {
      if (u.legacyRole === 'HR_ADMIN' || u.legacyRole === 'GLOBAL_VIEWER') {
        return { allowedEntityIds: 'ALL' as const }
      }
      if (u.legacyRole === 'NONE') return { allowedEntityIds: [] }
      return { allowedEntityIds: u.memberships.map((m) => m.entityId) }
    },
  },
]

function normalizeSet(value: 'ALL' | string[]): string {
  if (value === 'ALL') return 'ALL'
  return [...value].sort().join(',') || '(none)'
}

async function main() {
  console.log('\n═══ RBAC v2 verificatie ═══\n')

  const entities = await prisma.entity.findMany({ select: { id: true } })
  const allEntityIds = entities.map((e) => e.id)

  const users = await prisma.user.findMany({
    include: {
      memberships: { select: { entityId: true, canEdit: true } },
      roleAssignments: {
        include: {
          role: { include: { permissions: { select: { permissionKey: true } } } },
        },
      },
    },
  })

  let divergences = 0
  let perfectMatches = 0
  const detailedDivergences: string[] = []

  for (const user of users) {
    const authUser = toAuthorizedUser(user)
    const legacyUser: LegacyUser = {
      id: user.id,
      email: user.email,
      legacyRole: user.legacyRole,
      legacyPermissions: user.legacyPermissions,
      memberships: user.memberships,
    }

    let userHasDivergence = false
    const userReport: string[] = []

    for (const tc of TEST_CASES) {
      const legacyResult = tc.legacyCheck(legacyUser, { entityIds: allEntityIds })

      if (typeof legacyResult === 'boolean') {
        const newResult = can(authUser, tc.permission)
        if (legacyResult !== newResult) {
          userHasDivergence = true
          userReport.push(
            `    ✗ ${tc.label}: legacy=${legacyResult} ≠ new=${newResult}`,
          )
        }
      } else {
        const newResult = visibleEntityIds(authUser, tc.permission)
        const legacyNorm = normalizeSet(legacyResult.allowedEntityIds)
        const newNorm = normalizeSet(newResult)
        if (legacyNorm !== newNorm) {
          userHasDivergence = true
          userReport.push(
            `    ✗ ${tc.label}: legacy=${legacyNorm} ≠ new=${newNorm}`,
          )
        }
      }
    }

    if (userHasDivergence) {
      divergences++
      detailedDivergences.push(
        `\n  ${user.email} (legacyRole=${user.legacyRole}, memberships=${user.memberships.length}, roleAssignments=${authUser.roleAssignments.length}):`,
      )
      detailedDivergences.push(...userReport)
    } else {
      perfectMatches++
    }
  }

  console.log(`Users gecontroleerd: ${users.length}`)
  console.log(`  ✓ Perfect match:   ${perfectMatches}`)
  console.log(`  ✗ Divergenties:    ${divergences}`)

  if (divergences > 0) {
    console.log('\n── Divergentie-detail ──')
    for (const line of detailedDivergences) console.log(line)
    console.log(
      '\n⚠ Losse bovenstaande divergenties op voor je mergt. Verwachte oorzaken:\n' +
        '  - NONE-users hadden voorheen stiekem toegang via een edge case\n' +
        '  - Membership-data ontbreekt voor users die legacyRole=ENTITY_EDITOR/VIEWER zijn\n' +
        '  - Seed is nog niet correct gedraaid\n',
    )
    process.exit(1)
  }

  console.log('\n✔ Zero divergence — RBAC v2 mag mergen.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
