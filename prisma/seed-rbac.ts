/**
 * Seed script — synchroniseert de permission-registry (`lib/authz-registry.ts`)
 * met de database en zet de 6 system roles op.
 *
 * Idempotent: safe om meerdere keren te draaien. Permissions van system roles
 * worden ge-rewriten naar de canonical set (zodat een permission-toevoeging in
 * code automatisch in de juiste system rol terechtkomt). Custom rollen worden
 * NIET aangeraakt.
 *
 * Run: `npm run db:seed-rbac`
 */

import { PrismaClient } from '@prisma/client'
import { PERMISSIONS } from '../lib/authz-registry'

const prisma = new PrismaClient()

type SystemRoleSpec = {
  key: string
  name: string
  description: string
  bypassEntityScope: boolean
  permissions: readonly string[] | 'ALL' | { match: (key: string) => boolean }
}

// Helper om permissions te pluggen per rol
const allKeys: string[] = PERMISSIONS.map((p) => p.key)

const SYSTEM_ROLES: SystemRoleSpec[] = [
  {
    key: 'hr-admin',
    name: 'HR Administrator',
    description:
      'Volledige toegang tot het systeem. Kan gebruikers, rollen, entiteiten en alle data beheren over alle entiteiten heen.',
    bypassEntityScope: true,
    permissions: 'ALL',
  },
  {
    key: 'global-viewer',
    name: 'Globale lezer',
    description:
      'Kan alle data bekijken over alle entiteiten heen, maar niets wijzigen. Geen toegang tot salaris/bankgegevens.',
    bypassEntityScope: true,
    permissions: {
      match: (k: string) =>
        k.includes(':read') &&
        !k.includes(':read:salary') &&
        !k.includes(':read:bankaccount'),
    },
  },
  {
    key: 'entity-editor',
    name: 'Entiteit-beheerder',
    description:
      'Kan starters, taken en materialen beheren voor de toegewezen entiteiten. Geen toegang tot salaris- of bankgegevens.',
    bypassEntityScope: false,
    permissions: {
      match: (k: string) =>
        (k.startsWith('starters:') ||
          k.startsWith('tasks:') ||
          k === 'materials:read' ||
          k === 'materials:assign' ||
          k === 'reporting:kpi:read') &&
        !k.includes(':read:salary') &&
        !k.includes(':read:bankaccount'),
    },
  },
  {
    key: 'entity-viewer',
    name: 'Entiteit-lezer',
    description:
      'Kan data bekijken voor de toegewezen entiteiten, maar niets wijzigen.',
    bypassEntityScope: false,
    permissions: {
      match: (k: string) =>
        (k === 'starters:read' ||
          k === 'tasks:read' ||
          k === 'materials:read') &&
        !k.includes(':read:salary') &&
        !k.includes(':read:bankaccount'),
    },
  },
  {
    key: 'material-manager',
    name: 'Materiaalbeheerder',
    description:
      'Kan materiaal-catalogus beheren en materialen toewijzen aan starters. Geldt voor alle entiteiten.',
    bypassEntityScope: true,
    permissions: ['materials:read', 'materials:manage', 'materials:assign'],
  },
]

async function upsertPermissions() {
  console.log(`→ Seeding ${PERMISSIONS.length} permissions…`)
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        description: p.description,
        category: p.category,
        isFieldLevel: p.isFieldLevel ?? false,
      },
      update: {
        description: p.description,
        category: p.category,
        isFieldLevel: p.isFieldLevel ?? false,
      },
    })
  }
  // Cleanup: verwijder permissions in DB die niet meer in de registry staan
  // (voorkomt "dode" permission-records die niet meer gecheckt worden in code)
  const registryKeys = new Set(PERMISSIONS.map((p) => p.key))
  const all = await prisma.permission.findMany({ select: { key: true } })
  const stale = all.filter((p) => !registryKeys.has(p.key))
  if (stale.length > 0) {
    console.log(`  ⚠ Verwijder ${stale.length} verweesde permissions: ${stale.map((p) => p.key).join(', ')}`)
    await prisma.permission.deleteMany({ where: { key: { in: stale.map((p) => p.key) } } })
  }
}

function resolvePermissions(spec: SystemRoleSpec['permissions']): string[] {
  if (spec === 'ALL') return allKeys
  if (Array.isArray(spec)) return [...spec]
  return allKeys.filter((spec as { match: (key: string) => boolean }).match)
}

async function upsertSystemRoles() {
  console.log(`→ Seeding ${SYSTEM_ROLES.length} system roles…`)
  for (const spec of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { key: spec.key },
      create: {
        key: spec.key,
        name: spec.name,
        description: spec.description,
        isSystem: true,
        bypassEntityScope: spec.bypassEntityScope,
      },
      update: {
        name: spec.name,
        description: spec.description,
        isSystem: true,
        bypassEntityScope: spec.bypassEntityScope,
      },
    })

    const desired = resolvePermissions(spec.permissions)
    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionKey: true },
    })
    const existingKeys = new Set(existing.map((e) => e.permissionKey))
    const desiredKeys = new Set(desired)

    const toAdd = desired.filter((k) => !existingKeys.has(k))
    const toRemove = [...existingKeys].filter((k) => !desiredKeys.has(k))

    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((permissionKey) => ({ roleId: role.id, permissionKey })),
        skipDuplicates: true,
      })
    }
    if (toRemove.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permissionKey: { in: toRemove } },
      })
    }

    console.log(
      `  ✓ ${spec.key.padEnd(20)} ${desired.length} permissions (+${toAdd.length} / -${toRemove.length})`,
    )
  }
}

async function main() {
  console.log('\n═══ RBAC v2 seed ═══\n')
  await upsertPermissions()
  await upsertSystemRoles()
  console.log('\n✔ RBAC seed klaar.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
