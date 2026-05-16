export interface RecruitmentEmailVariable {
  key: string
  descriptionKey: string
  sampleValue: string
}

export const RECRUITMENT_EMAIL_VARIABLES: RecruitmentEmailVariable[] = [
  { key: 'candidate_name', descriptionKey: 'recruitment.emailTemplates.vars.candidateName', sampleValue: 'Jan Peeters' },
  { key: 'candidate_first_name', descriptionKey: 'recruitment.emailTemplates.vars.candidateFirstName', sampleValue: 'Jan' },
  { key: 'candidate_last_name', descriptionKey: 'recruitment.emailTemplates.vars.candidateLastName', sampleValue: 'Peeters' },
  { key: 'vacancy_title', descriptionKey: 'recruitment.emailTemplates.vars.vacancyTitle', sampleValue: 'Beveiligingsagent Brussels Airport' },
  { key: 'entity_name', descriptionKey: 'recruitment.emailTemplates.vars.entityName', sampleValue: 'ACEG Security' },
  { key: 'stage_name', descriptionKey: 'recruitment.emailTemplates.vars.stageName', sampleValue: 'Interview' },
  { key: 'rejection_reason', descriptionKey: 'recruitment.emailTemplates.vars.rejectionReason', sampleValue: 'Profiel past niet bij de huidige vacature' },
  { key: 'application_date', descriptionKey: 'recruitment.emailTemplates.vars.applicationDate', sampleValue: '15/05/2026' },
  { key: 'portal_link', descriptionKey: 'recruitment.emailTemplates.vars.portalLink', sampleValue: 'https://app.example.com/candidate/abc123' },
]

export function renderRecruitmentTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    rendered = rendered.replace(regex, value)
  }
  return rendered
}

export function getUnresolvedVariables(rendered: string): string[] {
  const matches = rendered.match(/{{\s*([^}]+?)\s*}}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.replace(/{{\s*|\s*}}/g, '')))]
}

export function getSampleVariables(): Record<string, string> {
  const sample: Record<string, string> = {}
  for (const v of RECRUITMENT_EMAIL_VARIABLES) {
    sample[v.key] = v.sampleValue
  }
  return sample
}
