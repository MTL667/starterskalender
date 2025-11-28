import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  contractSignedOn?: Date | string | null
  startDate: Date | string
  entity?: {
    name: string
  } | null
}

interface TemplateVariables {
  // User variabelen
  userName?: string
  userEmail?: string

  // Starter variabelen (voor weekly reminder)
  starterName?: string
  starterRole?: string
  starterStartDate?: string
  starterLanguage?: string
  entityName?: string

  // Summary variabelen
  period?: string // "december 2025", "Q4 2025", "2025"
  totalStarters?: number
  startersList?: string // HTML lijst van starters
  
  // Chart/stats variabelen
  chartUrl?: string
  statsHtml?: string
}

/**
 * Render email template met variabelen
 */
export function renderEmailTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let rendered = template

  // Replace alle variabelen
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    rendered = rendered.replace(regex, String(value ?? ''))
  })

  return rendered
}

/**
 * Genereer variabelen voor weekly reminder
 */
export function getWeeklyReminderVariables(
  userName: string,
  userEmail: string,
  starter: Starter
): TemplateVariables {
  const startDate = typeof starter.startDate === 'string' 
    ? new Date(starter.startDate) 
    : starter.startDate

  return {
    userName,
    userEmail,
    starterName: starter.name,
    starterRole: starter.roleTitle || 'Geen functie opgegeven',
    starterStartDate: format(startDate, 'EEEE d MMMM yyyy', { locale: nl }),
    starterLanguage: starter.language === 'FR' ? 'Frans' : 'Nederlands',
    entityName: starter.entity?.name || 'Onbekende entiteit',
  }
}

/**
 * Genereer variabelen voor monthly summary
 */
export function getMonthlySummaryVariables(
  userName: string,
  userEmail: string,
  entityName: string,
  month: number,
  year: number,
  starters: Starter[]
): TemplateVariables {
  const monthName = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: nl })

  const startersList = starters.length === 0
    ? '<p>Geen starters deze maand.</p>'
    : `
      <ul style="list-style-type: none; padding: 0;">
        ${starters.map(s => {
          const startDate = typeof s.startDate === 'string' ? new Date(s.startDate) : s.startDate
          return `
            <li style="padding: 10px; margin: 5px 0; background: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 4px;">
              <strong>${s.name}</strong> ${s.language === 'FR' ? '🇫🇷' : '🇳🇱'}<br/>
              ${s.roleTitle ? `<span style="color: #6b7280;">${s.roleTitle}</span><br/>` : ''}
              <span style="color: #6b7280; font-size: 14px;">Start: ${format(startDate, 'd MMMM yyyy', { locale: nl })}</span>
            </li>
          `
        }).join('')}
      </ul>
    `

  return {
    userName,
    userEmail,
    entityName,
    period: monthName,
    totalStarters: starters.length,
    startersList,
  }
}

/**
 * Genereer variabelen voor quarterly summary
 */
export function getQuarterlySummaryVariables(
  userName: string,
  userEmail: string,
  entityName: string,
  quarter: number,
  year: number,
  starters: Starter[]
): TemplateVariables {
  const quarterName = `Q${quarter} ${year}`

  const startersList = starters.length === 0
    ? '<p>Geen starters dit kwartaal.</p>'
    : `
      <ul style="list-style-type: none; padding: 0;">
        ${starters.map(s => {
          const startDate = typeof s.startDate === 'string' ? new Date(s.startDate) : s.startDate
          return `
            <li style="padding: 10px; margin: 5px 0; background: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 4px;">
              <strong>${s.name}</strong> ${s.language === 'FR' ? '🇫🇷' : '🇳🇱'}<br/>
              ${s.roleTitle ? `<span style="color: #6b7280;">${s.roleTitle}</span><br/>` : ''}
              <span style="color: #6b7280; font-size: 14px;">Start: ${format(startDate, 'd MMMM yyyy', { locale: nl })}</span>
            </li>
          `
        }).join('')}
      </ul>
    `

  return {
    userName,
    userEmail,
    entityName,
    period: quarterName,
    totalStarters: starters.length,
    startersList,
  }
}

/**
 * Genereer variabelen voor yearly summary
 */
export function getYearlySummaryVariables(
  userName: string,
  userEmail: string,
  entityName: string,
  year: number,
  starters: Starter[],
  statsHtml?: string
): TemplateVariables {
  const startersList = starters.length === 0
    ? '<p>Geen starters dit jaar.</p>'
    : `
      <ul style="list-style-type: none; padding: 0;">
        ${starters.map(s => {
          const startDate = typeof s.startDate === 'string' ? new Date(s.startDate) : s.startDate
          return `
            <li style="padding: 10px; margin: 5px 0; background: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 4px;">
              <strong>${s.name}</strong> ${s.language === 'FR' ? '🇫🇷' : '🇳🇱'}<br/>
              ${s.roleTitle ? `<span style="color: #6b7280;">${s.roleTitle}</span><br/>` : ''}
              <span style="color: #6b7280; font-size: 14px;">Start: ${format(startDate, 'd MMMM yyyy', { locale: nl })}</span>
            </li>
          `
        }).join('')}
      </ul>
    `

  return {
    userName,
    userEmail,
    entityName,
    period: String(year),
    totalStarters: starters.length,
    startersList,
    statsHtml: statsHtml || '',
  }
}

/**
 * Beschikbare variabelen per template type
 */
export const TEMPLATE_VARIABLES = {
  WEEKLY_REMINDER: [
    { name: 'userName', description: 'Naam van de ontvanger' },
    { name: 'userEmail', description: 'Email van de ontvanger' },
    { name: 'starterName', description: 'Naam van de starter' },
    { name: 'starterRole', description: 'Functie van de starter' },
    { name: 'starterStartDate', description: 'Startdatum (volledig geformatteerd)' },
    { name: 'starterLanguage', description: 'Taal van de starter (Nederlands/Frans)' },
    { name: 'entityName', description: 'Naam van de entiteit' },
  ],
  MONTHLY_SUMMARY: [
    { name: 'userName', description: 'Naam van de ontvanger' },
    { name: 'userEmail', description: 'Email van de ontvanger' },
    { name: 'entityName', description: 'Naam van de entiteit' },
    { name: 'period', description: 'Periode (bv. "december 2025")' },
    { name: 'totalStarters', description: 'Aantal starters in deze periode' },
    { name: 'startersList', description: 'HTML lijst van starters' },
  ],
  QUARTERLY_SUMMARY: [
    { name: 'userName', description: 'Naam van de ontvanger' },
    { name: 'userEmail', description: 'Email van de ontvanger' },
    { name: 'entityName', description: 'Naam van de entiteit' },
    { name: 'period', description: 'Periode (bv. "Q4 2025")' },
    { name: 'totalStarters', description: 'Aantal starters in deze periode' },
    { name: 'startersList', description: 'HTML lijst van starters' },
  ],
  YEARLY_SUMMARY: [
    { name: 'userName', description: 'Naam van de ontvanger' },
    { name: 'userEmail', description: 'Email van de ontvanger' },
    { name: 'entityName', description: 'Naam van de entiteit' },
    { name: 'period', description: 'Periode (bv. "2025")' },
    { name: 'totalStarters', description: 'Aantal starters in dit jaar' },
    { name: 'startersList', description: 'HTML lijst van starters' },
    { name: 'statsHtml', description: 'Optionele HTML met statistieken' },
  ],
}

/**
 * Default templates als er nog geen in database staan
 * OPMERKING: Deze templates worden gebruikt voor DIGEST emails (meerdere entiteiten in 1 email)
 * De variabelen worden dynamisch gegenereerd door de cron jobs
 */
export const DEFAULT_TEMPLATES = {
  WEEKLY_REMINDER: {
    subject: '🔔 Wekelijkse Reminder - Aankomende Starters',
    body: `
<!DOCTYPE html>
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
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 700;">
                🔔 Wekelijkse Reminder
              </h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hallo <strong>{{userName}}</strong>,
              </p>
            </td>
          </tr>
          
          <!-- Intro -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                De volgende starters beginnen <strong>volgende week</strong>. Zorg ervoor dat alle voorbereidingen getroffen zijn voor een succesvolle onboarding!
              </p>
            </td>
          </tr>
          
          <!-- Starters List (dynamically generated) -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              {{startersList}}
            </td>
          </tr>
          
          <!-- Call to Action -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                      💡 TIP: Controleer of alle materialen en toegangen klaar zijn
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Je ontvangt deze wekelijkse reminder omdat je geabonneerd bent op notificaties.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Wijzig je voorkeuren in de <a href="{{appUrl}}/profiel" style="color: #3b82f6; text-decoration: none;">profielinstellingen</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    description: 'Template voor wekelijkse reminders. Wordt verstuurd 7 dagen voor de startdatum. Bevat een digest van alle aankomende starters gegroepeerd per entiteit.',
  },
  MONTHLY_SUMMARY: {
    subject: '📊 Maandoverzicht - {{period}}',
    body: `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maandoverzicht</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                📊 Maandoverzicht
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; opacity: 0.9;">
                {{period}}
              </p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hallo <strong>{{userName}}</strong>,
              </p>
            </td>
          </tr>
          
          <!-- Intro -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hier is je maandelijkse samenvatting van alle nieuwe starters. Een overzicht van alle onboardings in de afgelopen maand, gegroepeerd per entiteit.
              </p>
            </td>
          </tr>
          
          <!-- Starters List (dynamically generated per entity) -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              {{startersList}}
            </td>
          </tr>
          
          <!-- Stats Summary -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #15803d; font-size: 14px; font-weight: 600;">
                      📈 Succesvol: Alle onboardings afgerond in {{period}}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Je ontvangt dit maandoverzicht omdat je geabonneerd bent op maandelijkse samenvattingen.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Wijzig je voorkeuren in de <a href="{{appUrl}}/profiel" style="color: #3b82f6; text-decoration: none;">profielinstellingen</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    description: 'Template voor maandelijkse samenvattingen. Wordt verstuurd op de 1e van elke maand. Bevat een digest van alle starters uit de vorige maand, gegroepeerd per entiteit.',
  },
  QUARTERLY_SUMMARY: {
    subject: '📈 Kwartaaloverzicht - {{period}}',
    body: `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kwartaaloverzicht</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                📈 Kwartaaloverzicht
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; opacity: 0.9;">
                {{period}}
              </p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hallo <strong>{{userName}}</strong>,
              </p>
            </td>
          </tr>
          
          <!-- Intro -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Een kijkje terug op {{period}}! Hier is een volledig overzicht van alle nieuwe starters in het afgelopen kwartaal, gegroepeerd per entiteit.
              </p>
            </td>
          </tr>
          
          <!-- Starters List (dynamically generated per entity) -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              {{startersList}}
            </td>
          </tr>
          
          <!-- Growth Indicator -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #047857; font-size: 14px; font-weight: 600;">
                      🎯 Kwartaaldoelstellingen: Op schema met de groeiplannen
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Je ontvangt dit kwartaaloverzicht omdat je geabonneerd bent op kwartaal samenvattingen.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Wijzig je voorkeuren in de <a href="{{appUrl}}/profiel" style="color: #3b82f6; text-decoration: none;">profielinstellingen</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    description: 'Template voor kwartaal samenvattingen. Wordt verstuurd op 1 januari, 1 april, 1 juli en 1 oktober. Bevat een digest van alle starters uit het vorige kwartaal, gegroepeerd per entiteit.',
  },
  YEARLY_SUMMARY: {
    subject: '🎉 Jaaroverzicht - {{period}}',
    body: `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jaaroverzicht</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
          <!-- Header -->
          <tr>
            <td style="padding: 50px 40px 30px 40px; background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                🎉 Jaaroverzicht {{period}}
              </h1>
              <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">
                Een terugblik op een succesvol jaar
              </p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Beste <strong>{{userName}}</strong>,
              </p>
            </td>
          </tr>
          
          <!-- Intro -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Het jaar {{period}} zit erop! Tijd voor een terugblik op alle nieuwe collega's die we mochten verwelkomen. Hieronder vind je een volledig overzicht van alle onboardings, inclusief statistieken per maand.
              </p>
            </td>
          </tr>
          
          <!-- Stats Section (if provided) -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              {{statsHtml}}
            </td>
          </tr>
          
          <!-- Starters List (dynamically generated per entity) -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">
                📋 Alle Starters van {{period}}
              </h3>
              {{startersList}}
            </td>
          </tr>
          
          <!-- Year Summary -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; padding: 25px; text-align: center;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #78350f; font-size: 16px; font-weight: 600;">
                      🏆 Gefeliciteerd met een succesvol jaar!
                    </p>
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      Alle nieuwe collega's dragen bij aan de groei en het succes van de organisatie. Op naar {{period + 1}}!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 2px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Je ontvangt dit jaaroverzicht omdat je geabonneerd bent op jaarlijkse samenvattingen.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Wijzig je voorkeuren in de <a href="{{appUrl}}/profiel" style="color: #3b82f6; text-decoration: none;">profielinstellingen</a>.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Year Badge -->
        <table style="margin-top: 20px;">
          <tr>
            <td align="center">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ⭐ Starterskalender · Jaarrapport {{period}} ⭐
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    description: 'Template voor jaarlijkse samenvattingen. Wordt verstuurd op 1 januari. Bevat een digest van alle starters uit het vorige jaar, met maandelijkse statistieken en gegroepeerd per entiteit. De meest uitgebreide en feestelijke template.',
  },
}

