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

    // === OFFBOARDING TEMPLATES ===

    // IT SETUP - Accounts deactiveren (offboarding)
    {
      type: 'IT_SETUP',
      title: 'Accounts deactiveren voor {{starterName}}',
      description: 'Deactiveer alle accounts en toegangen voor {{starterName}} ({{roleTitle}} bij {{entityName}}).\n\nStappen:\n1. Deactiveer het email account in Azure AD / Microsoft 365\n2. Verwijder toegang tot gedeelde mailboxen\n3. Blokkeer VPN en remote access\n4. Deactiveer toegangsbadge\n5. Verwijder uit distributielijsten en Teams kanalen\n6. Stel Out-of-Office bericht in (indien gewenst)\n7. Maak backup van relevante data\n8. Documenteer alle gedeactiveerde accounts',
      priority: 'HIGH',
      daysUntilDue: 0,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
      forStarterType: 'OFFBOARDING',
    },

    // IT SETUP - Materialen innemen (offboarding)
    {
      type: 'IT_SETUP',
      title: 'Materialen innemen van {{starterName}}',
      description: 'Neem alle bedrijfsmaterialen in van {{starterName}} ({{roleTitle}} bij {{entityName}}).\n\nChecklist:\n□ Laptop / Desktop computer\n□ Monitor(en)\n□ Toetsenbord en muis\n□ Headset\n□ Docking station\n□ Mobiele telefoon\n□ Toegangsbadge\n□ Sleutels\n□ Bedrijfswagen (indien van toepassing)\n□ Overige materialen\n\nStappen:\n1. Plan een moment voor het inleveren\n2. Controleer alle ingeleverde materialen\n3. Wis persoonlijke data van apparaten\n4. Registreer ingeleverde materialen in het systeem\n5. Meld ontbrekende materialen',
      priority: 'HIGH',
      daysUntilDue: 0,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
      forStarterType: 'OFFBOARDING',
    },

    // HR_ADMIN - Administratieve afhandeling (offboarding)
    {
      type: 'HR_ADMIN',
      title: 'Administratieve afhandeling vertrek {{starterName}}',
      description: 'Handel de administratie af voor het vertrek van {{starterName}} ({{roleTitle}} bij {{entityName}}).\n\nStappen:\n1. Controleer opzegtermijn en laatste werkdag\n2. Bereken openstaande vakantiedagen\n3. Bereid eindafrekening voor\n4. Stel getuigschrift op\n5. Informeer payroll over vertrek\n6. Update personeelsdossier\n7. Plan exitgesprek in',
      priority: 'HIGH',
      daysUntilDue: -7,
      isActive: true,
      autoAssign: true,
      forEntityIds: [],
      forJobRoleTitles: [],
      forStarterType: 'OFFBOARDING',
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

