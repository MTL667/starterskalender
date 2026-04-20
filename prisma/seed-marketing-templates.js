/*
 * Seed-script voor marketing task templates met dependencies.
 *
 * Afhankelijkheidsgraaf (AND-gate):
 *   MARKETING_PHOTO ──────┬────────► MARKETING_EDIT ──────┬────► MARKETING_VCARD
 *                         │                                │
 *                         │          MARKETING_UTM ────────┤
 *                         │                                │
 *                         └─► (UTM start parallel) ────────┘
 *
 *   MARKETING_VCARD ──► MARKETING_VISITEKAARTJE
 *   MARKETING_BADGE    (standalone, start date)
 *   MARKETING_NFC      (standalone, start date)
 *   MARKETING_SIGNATURE (dep op EDIT + UTM — fase 2)
 *
 * Run: node prisma/seed-marketing-templates.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Stabiele identifier per marketing-template (via title match)
const T = {
  PHOTO:         'Headshot maken van {{starterName}}',
  EDIT:          'Foto\u2019s bewerken van {{starterName}} (3 varianten)',
  UTM:           'UTM-code aanmaken voor vCard {{starterName}}',
  VCARD:         'vCard aanmaken voor {{starterName}}',
  VISITEKAARTJE: 'Visitekaartjes bestellen voor {{starterName}}',
  BADGE:         'Badge bestellen voor {{starterName}}',
  NFC:           'SIMA NFC badge bestellen voor {{starterName}}',
  SIGNATURE:     'Emailhandtekening aanmaken voor {{starterName}}',
}

// Templates zonder dependencies ingevuld (die worden later geresolved op ID)
const TEMPLATES = [
  {
    key: 'PHOTO',
    type: 'MARKETING_PHOTO',
    title: T.PHOTO,
    description: [
      'Neem een professionele headshot van {{starterName}} ({{roleTitle}} bij {{entityName}}) op de startersdag.',
      '',
      'Deliverables:',
      '- 1 RAW foto (hoogste kwaliteit) geüpload als "headshot-raw"',
      '',
      'Verantwoordelijke: Annelies (marketing)',
      'Locatie: fotografie-studio',
      'Startdatum: {{startDate}}',
    ].join('\n'),
    priority: 'HIGH',
    daysUntilDue: 0,
    scheduleType: 'ON_START_DATE',
    addToCalendar: true,
    uploadFolder: 'marketing',
    expectedOutputs: ['headshot-raw'],
    forStarterType: 'ONBOARDING',
    dependencies: [],
  },
  {
    key: 'UTM',
    type: 'MARKETING_UTM',
    title: T.UTM,
    description: [
      'Maak een UTM-trackingcode aan voor de vCard van {{starterName}} ({{roleTitle}} bij {{entityName}}).',
      '',
      'Startdatum: {{startDate}}',
      'Verantwoordelijke: Thomas (marketing)',
    ].join('\n'),
    priority: 'MEDIUM',
    daysUntilDue: 7,
    scheduleType: 'OFFSET_FROM_START',
    forStarterType: 'ONBOARDING',
    dependencies: [],
  },
  {
    key: 'EDIT',
    type: 'MARKETING_EDIT',
    title: T.EDIT,
    description: [
      'Bewerk de headshot van {{starterName}} en lever 3 varianten op:',
      '- Forms foto (hoge kwaliteit, algemene profielfoto)',
      '- LinkedIn / WhatsApp foto (vierkant, optimaal voor social)',
      '- Handtekening foto (portrait, achtergrond transparant)',
      '',
      'Upload alle 3 bestanden in deze taak.',
      '',
      'Verantwoordelijke: Lexi (marketing)',
    ].join('\n'),
    priority: 'HIGH',
    daysUntilDue: 3,
    scheduleType: 'AFTER_DEPENDENCIES',
    uploadFolder: 'marketing',
    expectedOutputs: ['forms-photo', 'linkedin', 'signature'],
    forStarterType: 'ONBOARDING',
    dependencies: ['PHOTO'],
  },
  {
    key: 'VCARD',
    type: 'MARKETING_VCARD',
    title: T.VCARD,
    description: [
      'Maak een vCard aan voor {{starterName}} ({{roleTitle}} bij {{entityName}}).',
      '',
      'Benodigdheden:',
      '- LinkedIn-foto (uit MARKETING_EDIT)',
      '- UTM-code (uit MARKETING_UTM)',
      '',
      'Verantwoordelijke: Louis (marketing)',
    ].join('\n'),
    priority: 'MEDIUM',
    daysUntilDue: 7,
    scheduleType: 'AFTER_DEPENDENCIES',
    forStarterType: 'ONBOARDING',
    dependencies: ['EDIT', 'UTM'],
  },
  {
    key: 'VISITEKAARTJE',
    type: 'MARKETING_VISITEKAARTJE',
    title: T.VISITEKAARTJE,
    description: [
      'Bestel visitekaartjes voor {{starterName}} ({{roleTitle}} bij {{entityName}}).',
      '',
      'Gebruik de gegenereerde vCard en UTM-code. Contactgegevens:',
      '- Email: {{desiredEmail}}',
      '- Telefoon: {{phoneNumber}}',
      '',
      'Manueel bestellen (Moo of andere leverancier).',
    ].join('\n'),
    priority: 'MEDIUM',
    daysUntilDue: 10,
    scheduleType: 'AFTER_DEPENDENCIES',
    forStarterType: 'ONBOARDING',
    dependencies: ['VCARD'],
  },
  {
    key: 'BADGE',
    type: 'MARKETING_BADGE',
    title: T.BADGE,
    description: [
      'Bestel Aceg-badge voor {{starterName}}.',
      '',
      'Let op: enkel voor inspecteurs of kwaliteit bij Aceg vzw.',
      'Contactgegevens: {{desiredEmail}}',
    ].join('\n'),
    priority: 'MEDIUM',
    daysUntilDue: 5,
    scheduleType: 'OFFSET_FROM_START',
    forStarterType: 'ONBOARDING',
    dependencies: [],
  },
  {
    key: 'NFC',
    type: 'MARKETING_NFC',
    title: T.NFC,
    description: [
      'Bestel SIMA NFC badge voor {{starterName}}.',
      '',
      'Gebruik de gegenereerde vCard (NFC-link verwijst hiernaar).',
    ].join('\n'),
    priority: 'MEDIUM',
    daysUntilDue: 10,
    scheduleType: 'AFTER_DEPENDENCIES',
    forStarterType: 'ONBOARDING',
    dependencies: ['VCARD'],
  },
  {
    key: 'SIGNATURE',
    type: 'MARKETING_SIGNATURE',
    title: T.SIGNATURE,
    description: [
      'Maak een emailhandtekening aan voor {{starterName}} ({{roleTitle}} bij {{entityName}}).',
      '',
      'Gebruik de handtekening-foto (uit MARKETING_EDIT) en de UTM-link (uit MARKETING_UTM).',
      '',
      'Fase 2: wordt later geautomatiseerd gegenereerd.',
    ].join('\n'),
    priority: 'LOW',
    daysUntilDue: 14,
    scheduleType: 'AFTER_DEPENDENCIES',
    forStarterType: 'ONBOARDING',
    isActive: false, // fase 2
    dependencies: ['EDIT', 'UTM'],
  },
]

async function main() {
  console.log('🌱 Seeding marketing task templates...')

  // Pass 1: upsert alle templates (zonder dependencies)
  const keyToId = {}
  for (const tpl of TEMPLATES) {
    const existing = await prisma.taskTemplate.findFirst({
      where: { type: tpl.type, title: tpl.title },
    })

    const data = {
      type: tpl.type,
      title: tpl.title,
      description: tpl.description,
      priority: tpl.priority,
      daysUntilDue: tpl.daysUntilDue,
      isActive: tpl.isActive !== undefined ? tpl.isActive : true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
      requireExplicitJobRole: true, // Marketing templates: opt-in per job role via admin matrix
      forStarterType: tpl.forStarterType,
      scheduleType: tpl.scheduleType,
      addToCalendar: !!tpl.addToCalendar,
      uploadFolder: tpl.uploadFolder || null,
      expectedOutputs: tpl.expectedOutputs || null,
      dependsOnTemplateIds: [],
    }

    if (existing) {
      // Bij re-seed: niet de in de admin matrix gezette job-role koppelingen overschrijven
      const updateData = { ...data }
      delete updateData.forJobRoleTitles
      delete updateData.forEntityIds
      const updated = await prisma.taskTemplate.update({
        where: { id: existing.id },
        data: updateData,
      })
      keyToId[tpl.key] = updated.id
      console.log(`🔄 Updated: ${tpl.title}`)
    } else {
      const created = await prisma.taskTemplate.create({ data })
      keyToId[tpl.key] = created.id
      console.log(`✅ Created: ${tpl.title}`)
    }
  }

  // Pass 2: dependencies invullen (nu we alle IDs kennen)
  for (const tpl of TEMPLATES) {
    if (!tpl.dependencies || tpl.dependencies.length === 0) continue
    const depIds = tpl.dependencies.map(k => keyToId[k]).filter(Boolean)
    await prisma.taskTemplate.update({
      where: { id: keyToId[tpl.key] },
      data: { dependsOnTemplateIds: depIds },
    })
    console.log(`🔗 Linked dependencies for ${tpl.key}: ${tpl.dependencies.join(', ')}`)
  }

  console.log('\n🎉 Marketing templates seeded.')
  console.log('\nGraaf:')
  console.log('  PHOTO (start date, calendar)')
  console.log('  UTM   (parallel)')
  console.log('  EDIT  ← PHOTO  (uploads: forms-photo, linkedin, signature)')
  console.log('  VCARD ← EDIT + UTM')
  console.log('  VISITEKAARTJE ← VCARD')
  console.log('  NFC   ← VCARD')
  console.log('  BADGE (parallel)')
  console.log('  SIGNATURE ← EDIT + UTM  (fase 2 — isActive:false)')
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
