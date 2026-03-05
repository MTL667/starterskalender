const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const TEMPLATE_TYPES = {
  'Mailadres toewijzen aan {{starterName}}': 'ONBOARDING',
  'Telefoonnummer toewijzen aan {{starterName}}': 'ONBOARDING',
  'Betrokken materialen voorzien voor {{starterName}}': 'ONBOARDING',
  'Accounts deactiveren voor {{starterName}}': 'OFFBOARDING',
  'Materialen innemen van {{starterName}}': 'OFFBOARDING',
  'Administratieve afhandeling vertrek {{starterName}}': 'OFFBOARDING',
  'Accounts aanpassen voor migratie {{starterName}}': 'MIGRATION',
  'Administratieve verwerking migratie {{starterName}}': 'MIGRATION',
}

async function main() {
  console.log('🔧 Fixing task template forStarterType values...\n')

  const templates = await prisma.taskTemplate.findMany()
  let fixed = 0

  for (const template of templates) {
    const expectedType = TEMPLATE_TYPES[template.title]
    if (expectedType && template.forStarterType !== expectedType) {
      await prisma.taskTemplate.update({
        where: { id: template.id },
        data: { forStarterType: expectedType },
      })
      console.log(`✅ Fixed: "${template.title}" (${template.forStarterType || 'null'} → ${expectedType})`)
      fixed++
    } else if (expectedType) {
      console.log(`⏭️  OK: "${template.title}" (${template.forStarterType})`)
    } else {
      console.log(`⚠️  Unknown template: "${template.title}" (${template.forStarterType || 'null'})`)
    }
  }

  console.log(`\n🎉 Done! Fixed ${fixed} template(s).`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
