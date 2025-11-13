const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding task templates...')

  const templates = [
    // IT SETUP - Mailadres toewijzen
    {
      type: 'IT_SETUP',
      title: 'Mailadres toewijzen aan {{starterName}}',
      description: 'Maak een email account aan voor {{starterName}} ({{desiredEmail}}) in Active Directory / Microsoft 365.\n\nStappen:\n1. Open Azure AD / Microsoft 365 Admin Center\n2. Maak nieuwe gebruiker aan met het gewenste mailadres\n3. Wijs de juiste licentie toe\n4. Stel een tijdelijk wachtwoord in\n5. Verstuur inloggegevens naar de starter\n6. Test of het account werkt\n\nLet op: Gebruik het gewenste mailadres zoals opgegeven in het starter profiel.',
      priority: 'HIGH',
      daysUntilDue: -7, // 7 dagen VOOR startdatum
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    
    // IT SETUP - Telefoonnummer toewijzen
    {
      type: 'IT_SETUP',
      title: 'Telefoonnummer toewijzen aan {{starterName}}',
      description: 'Wijs een telefoonnummer toe aan {{starterName}} (gewenst: {{phoneNumber}}).\n\nStappen:\n1. Check beschikbare nummers in de telefooncentrale\n2. Reserveer het nummer voor deze starter\n3. Configureer het nummer in het telefoniesysteem\n4. Koppel aan het email account indien nodig (voor voicemail)\n5. Test inkomende en uitgaande gesprekken\n6. Documenteer het toegewezen nummer\n\nLet op: Als er een specifiek nummer is aangevraagd, gebruik dan dat nummer indien beschikbaar.',
      priority: 'HIGH',
      daysUntilDue: -5, // 5 dagen voor start
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
    },
    
    // IT SETUP - Materialen voorzien
    {
      type: 'IT_SETUP',
      title: 'Betrokken materialen voorzien voor {{starterName}}',
      description: 'Zorg ervoor dat alle benodigde materialen klaarliggen voor {{starterName}} ({{roleTitle}} bij {{entityName}}).\n\nChecklist materialen:\n□ Laptop / Desktop computer\n□ Monitor(en)\n□ Toetsenbord en muis\n□ Headset voor Teams/bellen\n□ Docking station (indien nodig)\n□ Laptop tas / rugzak\n□ Mobiele telefoon (indien nodig)\n□ Toegangsbadge\n□ Kabels en adapters\n□ Andere functie-specifieke materialen\n\nStappen:\n1. Check welke materialen nodig zijn voor deze functie (zie materialen lijst in starter profiel)\n2. Verzamel alle materialen\n3. Configureer en test de hardware\n4. Installeer benodigde software op laptop\n5. Plaats alle materialen op de toegewezen werkplek\n6. Vink af in het systeem welke materialen verstrekt zijn\n\nLet op: Bekijk het starter profiel voor de volledige lijst van toegewezen materialen.',
      priority: 'HIGH',
      daysUntilDue: -3, // 3 dagen voor start
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
  console.log(`✅ Created: ${created} task template(s)`)
  console.log(`⏭️  Skipped: ${skipped} template(s) (already existed)`)
  console.log(`\n📋 Templates in database:`)
  console.log(`   1. Mailadres toewijzen (IT_SETUP) - 7 dagen voor start`)
  console.log(`   2. Telefoonnummer toewijzen (IT_SETUP) - 5 dagen voor start`)
  console.log(`   3. Betrokken materialen voorzien (IT_SETUP) - 3 dagen voor start`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding task templates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

