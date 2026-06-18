import { prisma } from '@/lib/prisma'
import { graphApiService, GraphApiError } from '@/lib/graph-api-service'
import { createAuditLog } from '@/lib/audit'
import { OffboardingState } from '@prisma/client'

type StepName =
  | 'OOO'
  | 'LOGIN_BLOCK'
  | 'REVOKE_SESSIONS'
  | 'CALENDAR'
  | 'TEAMS_TRANSFER'
  | 'GROUPS'
  | 'FORWARDING'
  | 'DELEGATES'
  | 'SIZE_CHECK'
  | 'CONVERSION'
  | 'LICENSE_REMOVAL'

const STEP_ORDER: StepName[] = [
  'OOO',
  'LOGIN_BLOCK',
  'REVOKE_SESSIONS',
  'CALENDAR',
  'TEAMS_TRANSFER',
  'GROUPS',
  'FORWARDING',
  'DELEGATES',
  'SIZE_CHECK',
  'CONVERSION',
  'LICENSE_REMOVAL',
]

const EXECUTING_STATES: Record<StepName, OffboardingState> = {
  OOO: 'EXECUTING_OOO',
  LOGIN_BLOCK: 'EXECUTING_LOGIN_BLOCK',
  REVOKE_SESSIONS: 'EXECUTING_REVOKE_SESSIONS',
  CALENDAR: 'EXECUTING_CALENDAR',
  TEAMS_TRANSFER: 'EXECUTING_TEAMS_TRANSFER',
  GROUPS: 'EXECUTING_GROUPS',
  FORWARDING: 'EXECUTING_FORWARDING',
  DELEGATES: 'EXECUTING_DELEGATES',
  SIZE_CHECK: 'EXECUTING_SIZE_CHECK',
  CONVERSION: 'EXECUTING_CONVERSION',
  LICENSE_REMOVAL: 'EXECUTING_LICENSE_REMOVAL',
}

const BLOCKED_STATES: Record<StepName, OffboardingState> = {
  OOO: 'BLOCKED_AT_OOO',
  LOGIN_BLOCK: 'BLOCKED_AT_LOGIN_BLOCK',
  REVOKE_SESSIONS: 'BLOCKED_AT_REVOKE_SESSIONS',
  CALENDAR: 'BLOCKED_AT_CALENDAR',
  TEAMS_TRANSFER: 'BLOCKED_AT_TEAMS_TRANSFER',
  GROUPS: 'BLOCKED_AT_GROUPS',
  FORWARDING: 'BLOCKED_AT_FORWARDING',
  DELEGATES: 'BLOCKED_AT_DELEGATES',
  SIZE_CHECK: 'BLOCKED_AT_SIZE_CHECK',
  CONVERSION: 'BLOCKED_AT_CONVERSION',
  LICENSE_REMOVAL: 'BLOCKED_AT_LICENSE_REMOVAL',
}

interface OffboardingContext {
  jobId: string
  entityId: string
  starterId: string
  graphUserId: string
  triggeredBy: string
}

export class OffboardingEngine {
  async startOffboarding(starterId: string, triggeredBy: string): Promise<{ jobId: string }> {
    const starter = await prisma.starter.findUnique({
      where: { id: starterId },
      select: {
        id: true,
        entityId: true,
        firstName: true,
        lastName: true,
        provisioningJobs: {
          where: { state: 'SUCCESS', graphUserId: { not: null } },
          select: { graphUserId: true },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    })

    const graphUserId = starter?.provisioningJobs?.[0]?.graphUserId
    if (!starter?.entityId || !graphUserId) {
      throw new Error('Starter not found or has no entity/provisioned mailbox')
    }

    const activeJob = await prisma.offboardingJob.findFirst({
      where: {
        starterId,
        state: { notIn: ['COMPLETED', 'ROLLED_BACK'] },
      },
    })

    if (activeJob && !['PENDING', 'READY', 'TEAMS_TRANSFER_PENDING'].includes(activeJob.state)) {
      throw new Error('Offboarding already in progress for this starter')
    }

    const job = activeJob || await prisma.offboardingJob.create({
      data: {
        starterId,
        entityId: starter.entityId,
        state: 'PENDING',
        triggeredBy,
        graphUserId,
      },
    })

    await prisma.offboardingJob.update({
      where: { id: job.id },
      data: { state: 'EXECUTING_OOO', startedAt: new Date(), currentStep: 1 },
    })

    await createAuditLog({
      actorId: triggeredBy,
      action: 'entra.offboarding.started',
      target: `OffboardingJob:${job.id}`,
      meta: { starterId, entityId: starter.entityId },
    })

    const ctx: OffboardingContext = {
      jobId: job.id,
      entityId: starter.entityId,
      starterId,
      graphUserId,
      triggeredBy,
    }

    this.executeFlow(ctx, 0).catch((err) => {
      console.error(`Offboarding job ${job.id} failed unexpectedly:`, err)
    })

    return { jobId: job.id }
  }

  async retryOffboarding(jobId: string, triggeredBy: string): Promise<{ jobId: string }> {
    const job = await prisma.offboardingJob.findUnique({ where: { id: jobId } })
    if (!job) throw new Error('Job not found')

    const blockedState = job.state as string
    if (!blockedState.startsWith('BLOCKED_AT_')) {
      throw new Error('Can only retry from a blocked state')
    }

    const stepName = blockedState.replace('BLOCKED_AT_', '') as StepName
    const stepIndex = STEP_ORDER.indexOf(stepName)
    if (stepIndex === -1) throw new Error('Invalid blocked state')

    if (!job.graphUserId) throw new Error('Job has no graphUserId')

    await createAuditLog({
      actorId: triggeredBy,
      action: 'entra.offboarding.retried',
      target: `OffboardingJob:${jobId}`,
      meta: { starterId: job.starterId, fromStep: stepName },
    })

    const ctx: OffboardingContext = {
      jobId,
      entityId: job.entityId,
      starterId: job.starterId,
      graphUserId: job.graphUserId,
      triggeredBy,
    }

    this.executeFlow(ctx, stepIndex).catch((err) => {
      console.error(`Offboarding retry ${jobId} failed unexpectedly:`, err)
    })

    return { jobId }
  }

  private async executeFlow(ctx: OffboardingContext, startFromStep: number): Promise<void> {
    for (let i = startFromStep; i < STEP_ORDER.length; i++) {
      const step = STEP_ORDER[i]

      await prisma.offboardingJob.update({
        where: { id: ctx.jobId },
        data: { state: EXECUTING_STATES[step], currentStep: i + 1, error: null },
      })

      try {
        await this.executeStep(step, ctx)
        await this.logStepResponse(ctx.jobId, step, { success: true })
      } catch (err: any) {
        const errorMessage = err instanceof GraphApiError ? err.message : (err.message || 'Unknown error')

        await prisma.offboardingJob.update({
          where: { id: ctx.jobId },
          data: { state: BLOCKED_STATES[step], error: errorMessage },
        })

        await this.logStepResponse(ctx.jobId, step, { success: false, error: errorMessage })

        await createAuditLog({
          actorId: ctx.triggeredBy,
          action: 'entra.offboarding.blocked',
          target: `OffboardingJob:${ctx.jobId}`,
          meta: { step, error: errorMessage, stepNumber: i + 1 },
        })

        return
      }

      await createAuditLog({
        actorId: ctx.triggeredBy,
        action: 'entra.offboarding.step_completed',
        target: `OffboardingJob:${ctx.jobId}`,
        meta: { step, stepNumber: i + 1 },
      })
    }

    await prisma.offboardingJob.update({
      where: { id: ctx.jobId },
      data: { state: 'COMPLETED', completedAt: new Date() },
    })

    await createAuditLog({
      actorId: ctx.triggeredBy,
      action: 'entra.offboarding.completed',
      target: `OffboardingJob:${ctx.jobId}`,
      meta: { starterId: ctx.starterId },
    })
  }

  private async executeStep(step: StepName, ctx: OffboardingContext): Promise<void> {
    switch (step) {
      case 'OOO':
        return this.executeOoo(ctx)
      case 'LOGIN_BLOCK':
        return this.executeLoginBlock(ctx)
      case 'REVOKE_SESSIONS':
        return this.executeRevokeSessions(ctx)
      case 'CALENDAR':
        return this.executeCalendar(ctx)
      case 'TEAMS_TRANSFER':
        return this.executeTeamsTransfer(ctx)
      case 'GROUPS':
        return this.executeGroups(ctx)
      case 'FORWARDING':
        return this.executeForwarding(ctx)
      case 'DELEGATES':
        return this.executeDelegates(ctx)
      case 'SIZE_CHECK':
        return this.executeSizeCheck(ctx)
      case 'CONVERSION':
        return this.executeConversion(ctx)
      case 'LICENSE_REMOVAL':
        return this.executeLicenseRemoval(ctx)
    }
  }

  private async executeOoo(ctx: OffboardingContext): Promise<void> {
    const starter = await prisma.starter.findUnique({
      where: { id: ctx.starterId },
      select: { firstName: true, lastName: true, roleTitle: true, entityId: true },
    })

    let jobRoleId: string | undefined
    if (starter?.roleTitle && starter.entityId) {
      const jobRole = await prisma.jobRole.findFirst({
        where: { entityId: starter.entityId, title: starter.roleTitle },
        select: { id: true },
      })
      jobRoleId = jobRole?.id
    }

    const template = await prisma.oooTemplate.findFirst({
      where: {
        entityId: ctx.entityId,
        OR: [
          ...(jobRoleId ? [{ jobRoleId }] : []),
          { jobRoleId: null },
        ],
      },
      orderBy: { jobRoleId: 'desc' },
    })

    if (!template) {
      throw new Error('No OOO template configured for this entity/function')
    }

    const renderTemplate = (text: string) =>
      text
        .replace(/\{voornaam\}/g, starter?.firstName || '')
        .replace(/\{achternaam\}/g, starter?.lastName || '')
        .replace(/\{algemeen_mailadres\}/g, template.generalMailAddress || '')

    const renderedNl = renderTemplate(template.templateNl)
    const renderedFr = renderTemplate(template.templateFr)
    const renderedEn = renderTemplate(template.templateEn)

    const combinedMessage = [renderedNl, renderedFr, renderedEn]
      .filter(Boolean)
      .join('\n\n---\n\n')

    await graphApiService.setOutOfOffice(ctx.entityId, ctx.graphUserId, combinedMessage, combinedMessage)
  }

  private async executeLoginBlock(ctx: OffboardingContext): Promise<void> {
    await graphApiService.disableUser(ctx.entityId, ctx.graphUserId)
  }

  private async executeRevokeSessions(ctx: OffboardingContext): Promise<void> {
    await graphApiService.revokeSignInSessions(ctx.entityId, ctx.graphUserId)
  }

  private async executeCalendar(ctx: OffboardingContext): Promise<void> {
    const events = await graphApiService.getUserCalendarEvents(ctx.entityId, ctx.graphUserId)
    for (const event of events) {
      await graphApiService.cancelCalendarEvent(ctx.entityId, ctx.graphUserId, event.id)
    }
  }

  private async executeTeamsTransfer(ctx: OffboardingContext): Promise<void> {
    const job = await prisma.offboardingJob.findUnique({ where: { id: ctx.jobId } })
    const mapping = (job?.teamsOwnershipMapping as any[]) || []

    for (const item of mapping) {
      await graphApiService.transferGroupOwnership(ctx.entityId, item.groupId, ctx.graphUserId, item.newOwnerId)
    }
  }

  private async executeGroups(ctx: OffboardingContext): Promise<void> {
    const { token } = await graphApiService.getAuthenticatedClient(ctx.entityId)
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${ctx.graphUserId}/memberOf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return

    const data = await res.json()
    const groups = (data.value || []).filter((g: any) => g['@odata.type'] === '#microsoft.graph.group')

    for (const group of groups) {
      await graphApiService.removeGroupMember(ctx.entityId, group.id, ctx.graphUserId).catch(() => {})
    }
  }

  private async executeForwarding(ctx: OffboardingContext): Promise<void> {
    const rules = await graphApiService.getUserMailRules(ctx.entityId, ctx.graphUserId)
    for (const rule of rules) {
      await graphApiService.deleteMailRule(ctx.entityId, ctx.graphUserId, rule.id)
    }
  }

  private async executeDelegates(ctx: OffboardingContext): Promise<void> {
    const rules = await graphApiService.getUserMailRules(ctx.entityId, ctx.graphUserId)
    const delegateRules = rules.filter((r: any) => r.actions?.forwardTo || r.actions?.redirectTo)
    for (const rule of delegateRules) {
      await graphApiService.deleteMailRule(ctx.entityId, ctx.graphUserId, rule.id)
    }
  }

  private async executeSizeCheck(ctx: OffboardingContext): Promise<void> {
    const stats = await graphApiService.getMailboxStatistics(ctx.entityId, ctx.graphUserId)
    if (stats.mailboxSizeMb >= 50000) {
      throw new Error(`Mailbox size ${stats.mailboxSizeMb}MB exceeds 50GB shared mailbox limit`)
    }
  }

  private async executeConversion(ctx: OffboardingContext): Promise<void> {
    await graphApiService.convertToSharedMailbox(ctx.entityId, ctx.graphUserId)
  }

  private async executeLicenseRemoval(ctx: OffboardingContext): Promise<void> {
    const { token } = await graphApiService.getAuthenticatedClient(ctx.entityId)
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${ctx.graphUserId}/licenseDetails`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return

    const data = await res.json()
    const skuIds = (data.value || []).map((l: any) => l.skuId).filter(Boolean)

    for (const skuId of skuIds) {
      await graphApiService.removeLicense(ctx.entityId, ctx.graphUserId, skuId)
    }
  }

  private async logStepResponse(jobId: string, step: string, result: { success: boolean; error?: string }): Promise<void> {
    const job = await prisma.offboardingJob.findUnique({ where: { id: jobId } })
    const responses = (job?.graphApiResponses as any[]) || []
    responses.push({ step, ...result, timestamp: new Date().toISOString() })
    await prisma.offboardingJob.update({
      where: { id: jobId },
      data: { graphApiResponses: responses },
    })
  }
}

export const offboardingEngine = new OffboardingEngine()
