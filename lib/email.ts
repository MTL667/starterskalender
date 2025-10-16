import sgMail from '@sendgrid/mail'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { createAuditLog } from './audit'

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')

export interface EmailStarter {
  id: string
  name: string
  region?: string | null
  roleTitle?: string | null
  startDate: Date
  entityName: string
  entityColor: string
}

export interface SendReminderEmailInput {
  to: string[]
  starters: EmailStarter[]
  entityName: string
}

/**
 * Stuurt een reminder e-mail voor komende starters
 */
export async function sendReminderEmail(input: SendReminderEmailInput): Promise<void> {
  const { to, starters, entityName } = input

  if (!to || to.length === 0) {
    console.warn('No recipients for reminder email')
    return
  }

  const starterRows = starters
    .map(
      (s) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.region || '-'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.roleTitle || '-'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${format(s.startDate, 'dd/MM/yyyy', { locale: nl })}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <span style="background: ${s.entityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
          ${s.entityName}
        </span>
      </td>
    </tr>
  `
    )
    .join('')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Starterskalender Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb;">
  <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 32px;">
      <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 16px;">Starterskalender Reminder</h1>
      <p style="color: #6b7280; margin: 0 0 24px;">De volgende personen starten volgende week bij <strong>${entityName}</strong>:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Naam</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Regio</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Functie</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Startdatum</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Entiteit</th>
          </tr>
        </thead>
        <tbody>
          ${starterRows}
        </tbody>
      </table>
      
      <p style="color: #6b7280; margin: 0 0 16px;">
        <a href="${process.env.NEXTAUTH_URL}/kalender" style="color: #3b82f6; text-decoration: none;">
          Bekijk de volledige kalender →
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      
      <p style="color: #9ca3af; font-size: 14px; margin: 0;">
        Deze e-mail werd automatisch verstuurd vanuit de Starterskalender applicatie.
      </p>
    </div>
  </div>
</body>
</html>
  `

  const msg = {
    to,
    from: process.env.MAIL_FROM || 'noreply@example.com',
    replyTo: process.env.MAIL_REPLY_TO,
    subject: `Starterskalender: ${starters.length} nieuwe starter(s) volgende week - ${entityName}`,
    html: htmlContent,
  }

  try {
    await sgMail.sendMultiple(msg)
    await createAuditLog({
      action: 'EMAIL_SENT',
      target: `Entity:${entityName}`,
      meta: {
        recipients: to,
        startersCount: starters.length,
        starterIds: starters.map(s => s.id),
      },
    })
  } catch (error: any) {
    console.error('Failed to send reminder email:', error)
    await createAuditLog({
      action: 'EMAIL_FAILED',
      target: `Entity:${entityName}`,
      meta: {
        error: error.message,
        recipients: to,
        startersCount: starters.length,
      },
    })
    throw error
  }
}

/**
 * Stuurt een test e-mail
 */
export async function sendTestEmail(to: string): Promise<void> {
  const msg = {
    to,
    from: process.env.MAIL_FROM || 'noreply@example.com',
    replyTo: process.env.MAIL_REPLY_TO,
    subject: 'Starterskalender - Test E-mail',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Email</title>
</head>
<body style="font-family: sans-serif; padding: 40px; background: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 32px; border-radius: 8px;">
    <h1 style="color: #1f2937; margin: 0 0 16px;">Test E-mail</h1>
    <p style="color: #6b7280; margin: 0;">
      Dit is een test e-mail vanuit de Starterskalender applicatie.
      Als je deze e-mail ontvangt, is de SendGrid integratie correct geconfigureerd.
    </p>
    <p style="color: #9ca3af; margin-top: 24px; font-size: 14px;">
      Verzonden op ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: nl })}
    </p>
  </div>
</body>
</html>
    `,
  }

  try {
    await sgMail.send(msg)
    await createAuditLog({
      action: 'EMAIL_SENT',
      target: 'TEST_EMAIL',
      meta: { recipient: to },
    })
  } catch (error: any) {
    console.error('Failed to send test email:', error)
    await createAuditLog({
      action: 'EMAIL_FAILED',
      target: 'TEST_EMAIL',
      meta: { error: error.message, recipient: to },
    })
    throw error
  }
}

