import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
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
 */
export const DEFAULT_TEMPLATES = {
  WEEKLY_REMINDER: {
    subject: '🔔 Reminder: {{starterName}} start volgende week',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">👋 Hallo {{userName}},</h2>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Dit is een vriendelijke herinnering dat <strong>{{starterName}}</strong> volgende week start bij <strong>{{entityName}}</strong>.
        </p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">Starter Details</h3>
          <ul style="color: #4b5563; line-height: 1.8;">
            <li><strong>Naam:</strong> {{starterName}}</li>
            <li><strong>Functie:</strong> {{starterRole}}</li>
            <li><strong>Startdatum:</strong> {{starterStartDate}}</li>
            <li><strong>Taal:</strong> {{starterLanguage}}</li>
            <li><strong>Entiteit:</strong> {{entityName}}</li>
          </ul>
        </div>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Zorg ervoor dat alle voorbereidingen getroffen zijn voor een succesvolle onboarding!
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px;">
          Je ontvangt deze email omdat je geabonneerd bent op notificaties voor {{entityName}}.
          <br/>
          Wijzig je voorkeuren in je profielinstellingen.
        </p>
      </div>
    `,
  },
  MONTHLY_SUMMARY: {
    subject: '📊 Maandoverzicht {{entityName}} - {{period}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">📊 Maandoverzicht {{period}}</h2>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Hallo {{userName}},
        </p>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Hier is een overzicht van alle starters bij <strong>{{entityName}}</strong> in {{period}}.
        </p>
        
        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0; color: #1e40af; font-size: 36px;">{{totalStarters}}</h3>
          <p style="margin: 5px 0 0 0; color: #1e40af;">Nieuwe starters</p>
        </div>
        
        <h3 style="color: #1f2937;">Starters deze maand:</h3>
        {{startersList}}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px;">
          Maandelijks overzicht voor {{entityName}}.
          <br/>
          Wijzig je voorkeuren in je profielinstellingen.
        </p>
      </div>
    `,
  },
  QUARTERLY_SUMMARY: {
    subject: '📈 Kwartaaloverzicht {{entityName}} - {{period}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">📈 Kwartaaloverzicht {{period}}</h2>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Hallo {{userName}},
        </p>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Hier is een overzicht van alle starters bij <strong>{{entityName}}</strong> in {{period}}.
        </p>
        
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0; color: #15803d; font-size: 36px;">{{totalStarters}}</h3>
          <p style="margin: 5px 0 0 0; color: #15803d;">Nieuwe starters dit kwartaal</p>
        </div>
        
        <h3 style="color: #1f2937;">Starters dit kwartaal:</h3>
        {{startersList}}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px;">
          Kwartaaloverzicht voor {{entityName}}.
          <br/>
          Wijzig je voorkeuren in je profielinstellingen.
        </p>
      </div>
    `,
  },
  YEARLY_SUMMARY: {
    subject: '🎉 Jaaroverzicht {{entityName}} - {{period}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">🎉 Jaaroverzicht {{period}}</h2>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Hallo {{userName}},
        </p>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Een kijkje terug op {{period}} bij <strong>{{entityName}}</strong>!
        </p>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0; color: #92400e; font-size: 36px;">{{totalStarters}}</h3>
          <p style="margin: 5px 0 0 0; color: #92400e;">Nieuwe starters in {{period}}</p>
        </div>
        
        {{statsHtml}}
        
        <h3 style="color: #1f2937;">Alle starters van {{period}}:</h3>
        {{startersList}}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px;">
          Jaaroverzicht voor {{entityName}}.
          <br/>
          Wijzig je voorkeuren in je profielinstellingen.
        </p>
      </div>
    `,
  },
}

