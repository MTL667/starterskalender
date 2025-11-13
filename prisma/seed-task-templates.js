const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding task templates...')

  const templates = [
    // IT SETUP
    {
      type: 'IT_SETUP',
      title: 'Email account aanmaken voor {{starterName}}',
      description: 'Maak een email account aan voor {{starterName}} ({{desiredEmail}}) in Active Directory / Microsoft 365.\n\nStappen:\n1. Open Azure AD / Microsoft 365 Admin Center\n2. Maak nieuwe gebruiker aan\n3. Wijs licentie toe\n4. Stel wachtwoord in\n5. Test inloggen',
      priority: 'HIGH',
      daysUntilDue: -7, // 7 dagen VOOR startdatum
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'IT_SETUP',
      title: 'Telefoonnummer toewijzen aan {{starterName}}',
      description: 'Wijs een telefoonnummer toe aan {{starterName}} (gewenst: {{phoneNumber}}).\n\nStappen:\n1. Check beschikbare nummers\n2. Reserveer nummer\n3. Configureer in telefooncentrale\n4. Test bellen',
      priority: 'MEDIUM',
      daysUntilDue: -5, // 5 dagen voor start
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'IT_SETUP',
      title: 'Laptop voorbereiden voor {{starterName}}',
      description: 'Bereid een laptop voor voor {{starterName}} (functie: {{roleTitle}}).\n\nStappen:\n1. Selecteer geschikte laptop\n2. Installeer Windows + updates\n3. Installeer standaard software\n4. Join domain\n5. Test alle functionaliteit',
      priority: 'HIGH',
      daysUntilDue: -3, // 3 dagen voor start
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'IT_SETUP',
      title: 'Accounts aanmaken voor {{starterName}}',
      description: 'Maak alle benodigde accounts aan voor {{starterName}}.\n\nAccounts:\n- Active Directory\n- ERP systeem\n- CRM systeem\n- Tijdregistratie\n- Andere bedrijfsapplicaties',
      priority: 'MEDIUM',
      daysUntilDue: -5,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },

    // HR ADMIN
    {
      type: 'HR_ADMIN',
      title: 'Contract klaarmaken voor {{starterName}}',
      description: 'Bereid het arbeidscontract voor voor {{starterName}} ({{roleTitle}} bij {{entityName}}).\n\nStappen:\n1. Template selecteren\n2. Gegevens invullen\n3. Laten controleren\n4. Printen en klaarzetten voor ondertekening',
      priority: 'HIGH',
      daysUntilDue: -10, // 10 dagen voor start
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'HR_ADMIN',
      title: 'Badge aanmaken voor {{starterName}}',
      description: 'Maak een toegangsbadge aan voor {{starterName}}.\n\nStappen:\n1. Foto laten maken\n2. Badge printen\n3. Toegangsrechten configureren\n4. Testen op toegangspoorten',
      priority: 'MEDIUM',
      daysUntilDue: -3,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'HR_ADMIN',
      title: 'Personeelsdossier aanmaken voor {{starterName}}',
      description: 'Maak een personeelsdossier aan voor {{starterName}}.\n\nDocumenten:\n- Kopie ID kaart\n- Diploma\'s\n- Referenties\n- Contract\n- RSZ documenten',
      priority: 'MEDIUM',
      daysUntilDue: 0, // Op startdatum
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },

    // FACILITIES
    {
      type: 'FACILITIES',
      title: 'Werkplek toewijzen aan {{starterName}}',
      description: 'Wijs een werkplek toe aan {{starterName}} bij {{entityName}}.\n\nStappen:\n1. Beschikbare werkplek kiezen\n2. Bureau klaarmaken\n3. Stoel instellen\n4. Monitor aansluiten\n5. Naambordje plaatsen',
      priority: 'MEDIUM',
      daysUntilDue: -2,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'FACILITIES',
      title: 'Parkeerplaats regelen voor {{starterName}}',
      description: 'Regel een parkeerplaats voor {{starterName}} (indien nodig).\n\nStappen:\n1. Check beschikbaarheid\n2. Parkeerkaart aanmaken\n3. Plaatsnummer toewijzen\n4. Instructies mailen',
      priority: 'LOW',
      daysUntilDue: -1,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'FACILITIES',
      title: 'Sleutels klaarmaken voor {{starterName}}',
      description: 'Zorg voor de benodigde sleutels voor {{starterName}}.\n\nSleutels:\n- Hoofdingang\n- Kantoor\n- Kast/locker\n- Overige',
      priority: 'MEDIUM',
      daysUntilDue: -1,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },

    // MANAGER ACTION
    {
      type: 'MANAGER_ACTION',
      title: 'Welkomstgesprek plannen met {{starterName}}',
      description: 'Plan een welkomstgesprek met {{starterName}} op de eerste werkdag.\n\nTopics:\n- Rondleiding kantoor\n- Team introductie\n- Verwachtingen bespreken\n- Vragen beantwoorden',
      priority: 'HIGH',
      daysUntilDue: 0, // Op startdatum
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'MANAGER_ACTION',
      title: 'Team introductie voor {{starterName}}',
      description: 'Introduceer {{starterName}} aan het team.\n\nStappen:\n1. Team meeting plannen\n2. Voorstelling voorbereiden\n3. Team lunch organiseren',
      priority: 'MEDIUM',
      daysUntilDue: 0,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    {
      type: 'MANAGER_ACTION',
      title: 'Onboarding plan opstellen voor {{starterName}}',
      description: 'Stel een onboarding plan op voor de eerste 30 dagen van {{starterName}} ({{roleTitle}}).\n\nIncludeer:\n- Training schema\n- Doelstellingen eerste maand\n- Mentor toewijzing\n- Evaluatie momenten',
      priority: 'HIGH',
      daysUntilDue: -5,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
  ]

  let created = 0
  let skipped = 0

  for (const template of templates) {
    // Check if template already exists
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        type: template.type,
        title: template.title,
      },
    })

    if (existing) {
      console.log(`⏭️  Skipped: ${template.title} (already exists)`)
      skipped++
    } else {
      await prisma.taskTemplate.create({
        data: template,
      })
      console.log(`✅ Created: ${template.title}`)
      created++
    }
  }

  console.log(`\n🎉 Seeding complete!`)
  console.log(`✅ Created: ${created} templates`)
  console.log(`⏭️  Skipped: ${skipped} templates (already existed)`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding task templates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

