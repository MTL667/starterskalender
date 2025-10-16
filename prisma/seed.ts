import { PrismaClient } from '@prisma/client'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  // Check of SEED_DUMMY enabled is
  if (process.env.SEED_DUMMY !== 'true') {
    console.log('SEED_DUMMY is not enabled. Skipping seed.')
    return
  }

  console.log('Starting seed...')

  // Maak 3 dummy entiteiten
  const entity1 = await prisma.entity.upsert({
    where: { name: 'Aceg' },
    update: {},
    create: {
      name: 'Aceg',
      colorHex: '#3b82f6',
      notifyEmails: ['hr@aceg.example.com'],
      isActive: true,
    },
  })

  const entity2 = await prisma.entity.upsert({
    where: { name: 'Asbuilt' },
    update: {},
    create: {
      name: 'Asbuilt',
      colorHex: '#10b981',
      notifyEmails: ['hr@asbuilt.example.com'],
      isActive: true,
    },
  })

  const entity3 = await prisma.entity.upsert({
    where: { name: 'Resol' },
    update: {},
    create: {
      name: 'Resol',
      colorHex: '#f59e0b',
      notifyEmails: ['hr@resol.example.com'],
      isActive: true,
    },
  })

  console.log('Created entities:', entity1.name, entity2.name, entity3.name)

  // Maak dropdown options
  const dropdownGroups = [
    { group: 'Regio', values: ['Vlaanderen', 'Brussel', 'Wallonië'] },
    { group: 'Via', values: ['Recruitmentbureau', 'LinkedIn', 'Referral', 'Website'] },
  ]

  for (const { group, values } of dropdownGroups) {
    for (let i = 0; i < values.length; i++) {
      await prisma.dropdownOption.upsert({
        where: {
          id: `${group.toLowerCase()}-${i}`,
        },
        update: {},
        create: {
          id: `${group.toLowerCase()}-${i}`,
          group,
          label: values[i],
          value: values[i].toLowerCase(),
          order: i,
          isActive: true,
        },
      })
    }
  }

  console.log('Created dropdown options')

  // Maak dummy starters
  const currentYear = new Date().getFullYear()
  const today = new Date()

  const starters = [
    {
      name: 'Jan Janssens',
      entityId: entity1.id,
      roleTitle: 'Software Engineer',
      region: 'Vlaanderen',
      via: 'LinkedIn',
      startDate: addDays(today, -30),
    },
    {
      name: 'Marie Dubois',
      entityId: entity2.id,
      roleTitle: 'Project Manager',
      region: 'Brussel',
      via: 'Referral',
      startDate: addDays(today, 14),
    },
    {
      name: 'Pieter Peeters',
      entityId: entity3.id,
      roleTitle: 'Consultant',
      region: 'Wallonië',
      via: 'Website',
      startDate: addDays(today, 45),
    },
  ]

  for (const starter of starters) {
    const weekNumber = Math.ceil(
      (starter.startDate.getTime() - new Date(currentYear, 0, 1).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    )

    await prisma.starter.create({
      data: {
        ...starter,
        year: currentYear,
        weekNumber,
      },
    })
  }

  console.log(`Created ${starters.length} dummy starters`)

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

