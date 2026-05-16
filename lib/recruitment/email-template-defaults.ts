import type { RecruitmentEmailType } from '@prisma/client'

export interface DefaultRecruitmentTemplate {
  type: RecruitmentEmailType
  name: string
  subject: string
  body: string
}

export const DEFAULT_RECRUITMENT_TEMPLATES: DefaultRecruitmentTemplate[] = [
  {
    type: 'APPLICATION_CONFIRMATION',
    name: 'Bevestiging sollicitatie',
    subject: 'Bevestiging van uw sollicitatie - {{vacancy_title}}',
    body: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Bevestiging</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
<tr><td style="padding:40px;">
<h1 style="margin:0 0 20px;color:#1f2937;font-size:24px;">Bedankt voor uw sollicitatie!</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
Beste {{candidate_name}},
</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
We hebben uw sollicitatie voor de functie <strong>{{vacancy_title}}</strong> bij {{entity_name}} goed ontvangen op {{application_date}}.
</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
We bekijken uw profiel met aandacht en nemen zo snel mogelijk contact met u op over de volgende stappen.
</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="color:#9ca3af;font-size:14px;margin:0;">
Met vriendelijke groeten,<br/>{{entity_name}}
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`.trim(),
  },
  {
    type: 'STAGE_TRANSITION',
    name: 'Status update',
    subject: 'Update over uw sollicitatie - {{vacancy_title}}',
    body: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Status update</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
<tr><td style="padding:40px;">
<h1 style="margin:0 0 20px;color:#1f2937;font-size:24px;">Update over uw sollicitatie</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
Beste {{candidate_name}},
</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
We willen u laten weten dat uw sollicitatie voor <strong>{{vacancy_title}}</strong> is bijgewerkt. Uw huidige status is: <strong>{{stage_name}}</strong>.
</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
We nemen binnenkort contact met u op met meer informatie.
</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="color:#9ca3af;font-size:14px;margin:0;">
Met vriendelijke groeten,<br/>{{entity_name}}
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`.trim(),
  },
  {
    type: 'REJECTION',
    name: 'Afwijzing',
    subject: 'Betreffende uw sollicitatie - {{vacancy_title}}',
    body: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Afwijzing</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
<tr><td style="padding:40px;">
<h1 style="margin:0 0 20px;color:#1f2937;font-size:24px;">Betreffende uw sollicitatie</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
Beste {{candidate_name}},
</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
Bedankt voor uw interesse in de functie <strong>{{vacancy_title}}</strong> bij {{entity_name}}.
</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;">
Na zorgvuldige overweging hebben we helaas besloten om niet verder te gaan met uw kandidatuur. We wensen u veel succes bij uw verdere zoektocht.
</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="color:#9ca3af;font-size:14px;margin:0;">
Met vriendelijke groeten,<br/>{{entity_name}}
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`.trim(),
  },
]
