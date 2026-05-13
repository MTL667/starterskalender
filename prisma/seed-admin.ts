/**
 * Bootstrap een admin-gebruiker bij een verse installatie.
 *
 * Gebruik:
 *   ADMIN_EMAIL=kevin@example.com npm run db:seed-admin
 *
 * Wat het doet:
 *   1. Maakt de user aan (of vindt een bestaande op basis van e-mail)
 *   2. Zet status op ACTIVE
 *   3. Kent de hr-admin system role toe (alle permissies)
 *
 * Idempotent: safe om meerdere keren te draaien.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  if (!email) {
    console.error('❌ ADMIN_EMAIL is niet ingesteld.')
    console.error('   Gebruik: ADMIN_EMAIL=kevin@example.com npm run db:seed-admin')
    process.exit(1)
  }

  console.log(`\n═══ Admin bootstrap ═══\n`)
  console.log(`  E-mail: ${email}`)

  const user = await prisma.user.upsert({
    where: { email },
    update: { status: 'ACTIVE' },
    create: {
      email,
      name: email.split('@')[0],
      status: 'ACTIVE',
      identityProvider: 'MANUAL',
    },
  })

  console.log(`  User:   ${user.id} (${user.status})`)

  const hrAdminRole = await prisma.role.findUnique({
    where: { key: 'hr-admin' },
  })

  if (!hrAdminRole) {
    console.error('❌ hr-admin rol niet gevonden. Run eerst: npm run db:seed-rbac')
    process.exit(1)
  }

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId: { userId: user.id, roleId: hrAdminRole.id },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: hrAdminRole.id,
      entityIds: [],
    },
  })

  console.log(`  Rol:    hr-admin (alle permissies, alle entiteiten)`)
  console.log(`\n✔ Admin-gebruiker klaar. Log in met ${email}.\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
