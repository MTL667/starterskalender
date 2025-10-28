import { PrismaClient } from '@prisma/client'
import { DEFAULT_TEMPLATES } from '../lib/email-template-engine'

const prisma = new PrismaClient()

async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...')

  const templates = [
    {
      type: 'WEEKLY_REMINDER',
      ...DEFAULT_TEMPLATES.WEEKLY_REMINDER,
    },
    {
      type: 'MONTHLY_SUMMARY',
      ...DEFAULT_TEMPLATES.MONTHLY_SUMMARY,
    },
    {
      type: 'QUARTERLY_SUMMARY',
      ...DEFAULT_TEMPLATES.QUARTERLY_SUMMARY,
    },
    {
      type: 'YEARLY_SUMMARY',
      ...DEFAULT_TEMPLATES.YEARLY_SUMMARY,
    },
  ] as const

  for (const template of templates) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { type: template.type },
    })

    if (existing) {
      console.log(`  ℹ️  ${template.type} - Already exists (skipping)`)
    } else {
      await prisma.emailTemplate.create({
        data: {
          type: template.type,
          subject: template.subject,
          body: template.body,
          description: template.description,
          isActive: true,
        },
      })
      console.log(`  ✅ ${template.type} - Created`)
    }
  }

  console.log('✨ Email templates seeding complete!')
}

seedEmailTemplates()
  .catch((error) => {
    console.error('❌ Error seeding email templates:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

