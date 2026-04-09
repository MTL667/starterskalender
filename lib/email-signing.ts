import { sendEmail } from './email'

interface SigningEmailParams {
  recipientEmail: string
  recipientName: string
  signingUrl: string
  documents: { title: string; signingMethod: string }[]
  entityName: string
  senderName: string
}

export async function sendSigningEmail(params: SigningEmailParams): Promise<void> {
  const { recipientEmail, recipientName, signingUrl, documents, entityName, senderName } = params

  const docRows = documents
    .map(d => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${d.title}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="background: ${d.signingMethod === 'QES' ? '#FF4612' : '#3b82f6'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
            ${d.signingMethod === 'QES' ? 'Itsme' : 'Digitaal'}
          </span>
        </td>
      </tr>`)
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 32px;">
      <h1 style="color: #1f2937; font-size: 22px; margin: 0 0 8px;">Documenten ter ondertekening</h1>
      <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
        Beste ${recipientName},
      </p>
      <p style="color: #374151; margin: 0 0 20px;">
        ${senderName} van <strong>${entityName}</strong> heeft documenten klaargezet die u moet ondertekenen.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; font-size: 14px;">Document</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; font-size: 14px;">Type</th>
          </tr>
        </thead>
        <tbody>
          ${docRows}
        </tbody>
      </table>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${signingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Documenten bekijken en ondertekenen
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">
        Of kopieer deze link in uw browser:
      </p>
      <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 0 0 24px;">
        ${signingUrl}
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Deze e-mail werd automatisch verstuurd vanuit Airport namens ${entityName}.
      </p>
    </div>
  </div>
</body>
</html>`

  await sendEmail({
    to: recipientEmail,
    subject: `${entityName} — Documenten ter ondertekening`,
    html,
  })
}
