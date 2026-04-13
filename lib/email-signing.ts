import { sendEmail } from './email'

interface SigningEmailParams {
  recipientEmail: string
  recipientName: string
  signingUrl: string
  documents: { title: string; signingMethod: string }[]
  entityName: string
  senderName: string
  dueDate?: Date | null
  language?: string
  documentId?: string
}

const i18n = {
  nl: {
    subject: (entity: string) => `${entity} — Documenten ter ondertekening`,
    title: 'Documenten ter ondertekening',
    greeting: (name: string) => `Beste ${name},`,
    intro: (sender: string, entity: string) => `${sender} van <strong>${entity}</strong> heeft documenten klaargezet die u moet ondertekenen.`,
    deadline: (date: string) => `Gelieve te ondertekenen vóór <strong>${date}</strong>.`,
    colDocument: 'Document',
    colType: 'Type',
    cta: 'Documenten bekijken en ondertekenen',
    copyLink: 'Of kopieer deze link in uw browser:',
    footer: (entity: string) => `Deze e-mail werd automatisch verstuurd vanuit Airport namens ${entity}.`,
    digital: 'Digitaal',
  },
  fr: {
    subject: (entity: string) => `${entity} — Documents à signer`,
    title: 'Documents à signer',
    greeting: (name: string) => `Cher/Chère ${name},`,
    intro: (sender: string, entity: string) => `${sender} de <strong>${entity}</strong> a préparé des documents nécessitant votre signature.`,
    deadline: (date: string) => `Veuillez signer avant le <strong>${date}</strong>.`,
    colDocument: 'Document',
    colType: 'Type',
    cta: 'Consulter et signer les documents',
    copyLink: 'Ou copiez ce lien dans votre navigateur :',
    footer: (entity: string) => `Cet e-mail a été envoyé automatiquement depuis Airport au nom de ${entity}.`,
    digital: 'Numérique',
  },
}

export async function sendSigningEmail(params: SigningEmailParams): Promise<void> {
  const { recipientEmail, recipientName, signingUrl, documents, entityName, senderName, dueDate, language, documentId } = params

  const lang = language?.toLowerCase().startsWith('fr') ? 'fr' : 'nl'
  const t = i18n[lang]

  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString(lang === 'fr' ? 'fr-BE' : 'nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const docRows = documents
    .map(d => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${d.title}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="background: ${d.signingMethod === 'QES' ? '#FF4612' : '#3b82f6'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
            ${d.signingMethod === 'QES' ? 'Itsme' : t.digital}
          </span>
        </td>
      </tr>`)
    .join('')

  const deadlineBlock = dueDateStr
    ? `<p style="color: #b91c1c; font-weight: 600; margin: 0 0 20px; padding: 10px 14px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #ef4444;">⏰ ${t.deadline(dueDateStr)}</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 32px;">
      <h1 style="color: #1f2937; font-size: 22px; margin: 0 0 8px;">${t.title}</h1>
      <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
        ${t.greeting(recipientName)}
      </p>
      <p style="color: #374151; margin: 0 0 20px;">
        ${t.intro(senderName, entityName)}
      </p>

      ${deadlineBlock}

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; font-size: 14px;">${t.colDocument}</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; font-size: 14px;">${t.colType}</th>
          </tr>
        </thead>
        <tbody>
          ${docRows}
        </tbody>
      </table>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${signingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          ${t.cta}
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">
        ${t.copyLink}
      </p>
      <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 0 0 24px;">
        ${signingUrl}
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        ${t.footer(entityName)}
      </p>
    </div>
  </div>
</body>
</html>`

  await sendEmail({
    to: recipientEmail,
    subject: t.subject(entityName),
    html,
    customArgs: documentId ? { documentId, type: 'signing' } : undefined,
  })
}

export async function sendSignedConfirmationEmail(params: {
  recipientEmail: string
  recipientName: string
  documentTitle: string
  entityName: string
  signedAt: Date
  language?: string
  downloadUrl?: string
}): Promise<void> {
  const { recipientEmail, recipientName, documentTitle, entityName, signedAt, language, downloadUrl } = params

  const lang = language?.toLowerCase().startsWith('fr') ? 'fr' : 'nl'

  const dateStr = signedAt.toLocaleDateString(lang === 'fr' ? 'fr-BE' : 'nl-BE', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const content = lang === 'fr' ? {
    subject: `${entityName} — Document signé avec succès`,
    title: 'Document signé avec succès',
    greeting: `Cher/Chère ${recipientName},`,
    body: `Votre document <strong>"${documentTitle}"</strong> a été signé avec succès le ${dateStr}.`,
    download: 'Télécharger le document signé',
    footer: `Cet e-mail a été envoyé automatiquement depuis Airport au nom de ${entityName}.`,
  } : {
    subject: `${entityName} — Document succesvol ondertekend`,
    title: 'Document succesvol ondertekend',
    greeting: `Beste ${recipientName},`,
    body: `Uw document <strong>"${documentTitle}"</strong> is succesvol ondertekend op ${dateStr}.`,
    download: 'Ondertekend document downloaden',
    footer: `Deze e-mail werd automatisch verstuurd vanuit Airport namens ${entityName}.`,
  }

  const downloadBlock = downloadUrl
    ? `<div style="text-align: center; margin: 32px 0;">
        <a href="${downloadUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          ✓ ${content.download}
        </a>
      </div>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #ecfdf5; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px;">✓</div>
      </div>
      <h1 style="color: #1f2937; font-size: 22px; margin: 0 0 8px; text-align: center;">${content.title}</h1>
      <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">${content.greeting}</p>
      <p style="color: #374151; margin: 0 0 20px;">${content.body}</p>
      ${downloadBlock}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">${content.footer}</p>
    </div>
  </div>
</body>
</html>`

  await sendEmail({
    to: recipientEmail,
    subject: content.subject,
    html,
  })
}
