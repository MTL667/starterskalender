import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { renderRecruitmentTemplate } from '@/lib/recruitment/email-variables'
import { createAuditLog } from '@/lib/audit'
import type { RecruitmentEmailType } from '@prisma/client'

interface SendRecruitmentEmailParams {
  candidateId: string
  vacancyId: string
  entityId: string
  type: RecruitmentEmailType
  extraVariables?: Record<string, string>
}

export async function sendRecruitmentEmail(params: SendRecruitmentEmailParams): Promise<boolean> {
  const { candidateId, vacancyId, entityId, type, extraVariables } = params

  try {
    const template = await prisma.recruitmentEmailTemplate.findFirst({
      where: { entityId, type, isActive: true },
    })

    if (!template) return false

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        stage: { select: { name: true } },
        vacancy: {
          select: {
            title: true,
            entity: { select: { name: true } },
          },
        },
      },
    })

    if (!candidate || !candidate.email) return false

    const variables: Record<string, string> = {
      candidate_name: `${candidate.firstName} ${candidate.lastName}`,
      candidate_first_name: candidate.firstName,
      candidate_last_name: candidate.lastName,
      vacancy_title: candidate.vacancy.title,
      entity_name: candidate.vacancy.entity.name,
      stage_name: candidate.stage.name,
      application_date: candidate.createdAt.toLocaleDateString('nl-BE'),
      portal_link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/candidate/portal`,
      ...extraVariables,
    }

    const renderedSubject = renderRecruitmentTemplate(template.subject, variables)
    const renderedBody = renderRecruitmentTemplate(template.body, variables)

    await sendEmail({
      to: candidate.email,
      subject: renderedSubject,
      html: renderedBody,
    })

    await createAuditLog({
      action: 'CANDIDATE_EMAIL_SENT',
      target: candidateId,
      meta: {
        templateId: template.id,
        type,
        vacancyId,
        recipient: candidate.email,
      },
    })

    return true
  } catch (error) {
    console.error(`Failed to send recruitment email (${type}):`, error)
    return false
  }
}

export async function sendStageTransitionEmail(
  candidateId: string,
  vacancyId: string,
  entityId: string,
  stageName?: string
): Promise<boolean> {
  return sendRecruitmentEmail({
    candidateId,
    vacancyId,
    entityId,
    type: 'STAGE_TRANSITION',
    extraVariables: stageName ? { stage_name: stageName } : undefined,
  })
}

export async function sendRejectionEmail(
  candidateId: string,
  vacancyId: string,
  entityId: string,
  rejectionReason?: string
): Promise<boolean> {
  return sendRecruitmentEmail({
    candidateId,
    vacancyId,
    entityId,
    type: 'REJECTION',
    extraVariables: rejectionReason ? { rejection_reason: rejectionReason } : undefined,
  })
}

export async function sendApplicationConfirmationEmail(
  candidateId: string,
  vacancyId: string,
  entityId: string
): Promise<boolean> {
  return sendRecruitmentEmail({
    candidateId,
    vacancyId,
    entityId,
    type: 'APPLICATION_CONFIRMATION',
  })
}
