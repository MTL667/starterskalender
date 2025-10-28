const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Default templates (JavaScript versie)
const DEFAULT_TEMPLATES = {
  WEEKLY_REMINDER: {
    type: 'WEEKLY_REMINDER',
    subject: '🔔 Wekelijkse Reminder - Aankomende Starters',
    description: 'Template voor wekelijkse reminders. Wordt verstuurd 7 dagen voor de startdatum. Bevat een digest van alle aankomende starters gegroepeerd per entiteit.',
    body: `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wekelijkse Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 700;">🔔 Wekelijkse Reminder</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">Hallo <strong>{{userName}}</strong>,</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">De volgende starters beginnen <strong>volgende week</strong>. Zorg ervoor dat alle voorbereidingen getroffen zijn voor een succesvolle onboarding!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">{{startersList}}</td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; padding: 20px;">
                <tr>
                  <td><p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">💡 TIP: Controleer of alle materialen en toegangen klaar zijn</p></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">Je ontvangt deze wekelijkse reminder omdat je geabonneerd bent op notificaties.</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">Wijzig je voorkeuren in de <a href="{{appUrl}}/profiel" style="color: #3b82f6; text-decoration: none;">profielinstellingen</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  MONTHLY_SUMMARY: {
    type: 'MONTHLY_SUMMARY',
    subject: '📊 Maandoverzicht - {{period}}',
    description: 'Template voor maandelijkse samenvattingen. Wordt verstuurd op de 1e van elke maand. Bevat een digest van alle starters uit de vorige maand, gegroepeerd per entiteit.',
    body: `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maandoverzicht</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">📊 Maandoverzicht</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px;">{{period}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px;">Hallo <strong>{{userName}}</strong>,</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px;">Hier is je maandelijkse samenvatting van alle nieuwe starters.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">{{startersList}}</td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">Wijzig je voorkeuren in de <a href="{{appUrl}}/profiel" style="color: #3b82f6;">profielinstellingen</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  QUARTERLY_SUMMARY: {
    type: 'QUARTERLY_SUMMARY',
    subject: '📈 Kwartaaloverzicht - {{period}}',
    description: 'Template voor kwartaal samenvattingen. Wordt verstuurd op 1 januari, 1 april, 1 juli en 1 oktober. Bevat een digest van alle starters uit het vorige kwartaal.',
    body: `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kwartaaloverzicht</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">📈 Kwartaaloverzicht</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px;">{{period}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px;">Hallo <strong>{{userName}}</strong>,</p>
              <p style="margin: 15px 0 0 0; color: #4b5563; font-size: 16px;">Een kijkje terug op {{period}}!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">{{startersList}}</td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">Wijzig je voorkeuren in de <a href="{{appUrl}}/profiel" style="color: #3b82f6;">profielinstellingen</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  YEARLY_SUMMARY: {
    type: 'YEARLY_SUMMARY',
    subject: '🎉 Jaaroverzicht - {{period}}',
    description: 'Template voor jaarlijkse samenvattingen. Wordt verstuurd op 1 januari. Bevat een digest van alle starters uit het vorige jaar.',
    body: `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jaaroverzicht</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 50px 40px 30px 40px; background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">🎉 Jaaroverzicht {{period}}</h1>
              <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 16px;">Een terugblik op een succesvol jaar</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px;">Beste <strong>{{userName}}</strong>,</p>
              <p style="margin: 15px 0 0 0; color: #4b5563; font-size: 16px;">Het jaar {{period}} zit erop! Tijd voor een terugblik op alle nieuwe collega's die we mochten verwelkomen.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">{{statsHtml}}</td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">📋 Alle Starters van {{period}}</h3>
              {{startersList}}
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 2px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">Wijzig je voorkeuren in de <a href="{{appUrl}}/profiel" style="color: #3b82f6;">profielinstellingen</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
}

async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...')

  const templates = Object.values(DEFAULT_TEMPLATES)

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

