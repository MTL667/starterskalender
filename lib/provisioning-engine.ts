import { prisma } from '@/lib/prisma'
import { graphApiService } from '@/lib/graph-api-service'
import { encryptEntra, decryptEntra } from '@/lib/encryption'
import { createAuditLog } from '@/lib/audit'
import { skuAvailableUnits } from '@/lib/provisioning-license'
import { randomBytes } from 'crypto'

type ProvisioningState = 'PENDING' | 'LICENSE_CHECKING' | 'USER_CREATING' | 'LICENSE_ASSIGNING' | 'TAP_CREATING' | 'MAILBOX_WAITING' | 'SUCCESS' | 'FAILED_AT_LICENSE_CHECK' | 'FAILED_AT_USER_CREATION' | 'FAILED_AT_LICENSE_ASSIGNMENT' | 'FAILED_AT_TAP' | 'FAILED_AT_MAILBOX_WAIT'

interface ProvisioningResult {
  jobId: string
  state: ProvisioningState
  email?: string
  temporaryPassword?: string
  error?: string
  assignedLicenseType?: string
}

export interface ProvisioningOptions {
  provisioningEntityId?: string
  licenseSkuId?: string
  licenseSkuDisplayName?: string
}

type StarterProvisioningFields = {
  id: string
  entityId: string | null
  firstName: string
  lastName: string
  desiredEmail: string | null
  roleTitle: string | null
}

export class ProvisioningEngine {
  async startProvisioning(
    starterId: string,
    triggeredBy: string,
    options: ProvisioningOptions = {}
  ): Promise<ProvisioningResult> {
    const starter = await prisma.starter.findUnique({
      where: { id: starterId },
      select: {
        id: true,
        entityId: true,
        firstName: true,
        lastName: true,
        desiredEmail: true,
        roleTitle: true,
      },
    })

    if (!starter || !starter.entityId) {
      throw new Error('Starter not found or has no entity')
    }

    const activeJob = await prisma.provisioningJob.findFirst({
      where: {
        starterId,
        state: { notIn: ['SUCCESS', 'FAILED_AT_LICENSE_CHECK', 'FAILED_AT_USER_CREATION', 'FAILED_AT_LICENSE_ASSIGNMENT', 'FAILED_AT_TAP', 'FAILED_AT_MAILBOX_WAIT'] },
      },
    })

    if (activeJob) {
      throw new Error('Provisioning already in progress for this starter')
    }

    const jobEntityId = options.provisioningEntityId || starter.entityId
    const job = await prisma.provisioningJob.create({
      data: {
        starterId,
        entityId: jobEntityId,
        state: 'PENDING',
        triggeredBy,
        assignedLicenseType: options.licenseSkuDisplayName || undefined,
        graphApiResponses: options.licenseSkuId
          ? { selectedSkuId: options.licenseSkuId, selectedSkuDisplayName: options.licenseSkuDisplayName || null }
          : undefined,
      },
    })

    await createAuditLog({
      actorId: triggeredBy,
      action: 'CREATE',
      target: `ProvisioningJob:${job.id}`,
      meta: { starterId, entityId: jobEntityId, starterEntityId: starter.entityId },
    })

    // Fire and forget - provisioning runs async, SSE endpoint tracks progress
    this.executeProvisioning(job.id, starter).catch((err) => {
      console.error(`Provisioning job ${job.id} failed unexpectedly:`, err)
    })

    return { jobId: job.id, state: 'PENDING' as ProvisioningState }
  }

  async retryProvisioning(
    jobId: string,
    triggeredBy: string,
    options: ProvisioningOptions = {}
  ): Promise<ProvisioningResult> {
    const failedJob = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
    if (!failedJob) throw new Error('Job not found')
    if (!failedJob.state.startsWith('FAILED_AT_')) {
      throw new Error('Can only retry a failed provisioning job')
    }

    const starter = await prisma.starter.findUnique({
      where: { id: failedJob.starterId },
      select: { id: true, entityId: true, firstName: true, lastName: true, desiredEmail: true, roleTitle: true },
    })

    if (!starter || !starter.entityId) throw new Error('Starter not found')

    const activeJob = await prisma.provisioningJob.findFirst({
      where: {
        starterId: failedJob.starterId,
        state: { notIn: ['SUCCESS', 'FAILED_AT_LICENSE_CHECK', 'FAILED_AT_USER_CREATION', 'FAILED_AT_LICENSE_ASSIGNMENT', 'FAILED_AT_TAP', 'FAILED_AT_MAILBOX_WAIT'] },
      },
    })
    if (activeJob) {
      throw new Error('Provisioning already in progress for this starter')
    }

    const jobEntityId = options.provisioningEntityId || failedJob.entityId
    const switchingEntity = jobEntityId !== failedJob.entityId
    const hasLicenseOverride = Boolean(options.licenseSkuId)
    // Fresh start only when switching Entra tenant (avoids orphaning Graph users on license-only retry)
    const startFresh = switchingEntity

    const previousResponses =
      failedJob.graphApiResponses && typeof failedJob.graphApiResponses === 'object' && !Array.isArray(failedJob.graphApiResponses)
        ? (failedJob.graphApiResponses as Record<string, unknown>)
        : {}

    const graphApiResponses = options.licenseSkuId
      ? {
          ...(!startFresh ? previousResponses : {}),
          selectedSkuId: options.licenseSkuId,
          selectedSkuDisplayName: options.licenseSkuDisplayName || null,
        }
      : startFresh
        ? undefined
        : failedJob.graphApiResponses ?? undefined

    const newJob = await prisma.provisioningJob.create({
      data: {
        starterId: failedJob.starterId,
        entityId: jobEntityId,
        state: 'PENDING',
        triggeredBy,
        graphUserId: startFresh ? null : failedJob.graphUserId,
        assignedLicenseType: options.licenseSkuDisplayName || (startFresh ? null : failedJob.assignedLicenseType),
        temporaryPassword: startFresh ? null : failedJob.temporaryPassword,
        graphApiResponses: graphApiResponses as object | undefined,
      },
    })

    await createAuditLog({
      actorId: triggeredBy,
      action: 'UPDATE',
      target: `ProvisioningJob:${newJob.id}`,
      meta: {
        retryOf: jobId,
        starterId: failedJob.starterId,
        entityId: jobEntityId,
        switchingEntity,
        hasLicenseOverride,
      },
    })

    this.executeProvisioning(
      newJob.id,
      starter,
      startFresh ? null : failedJob.state,
      startFresh ? null : failedJob.graphUserId
    ).catch((err) => {
      console.error(`Provisioning retry job ${newJob.id} failed unexpectedly:`, err)
    })

    return { jobId: newJob.id, state: 'PENDING' as ProvisioningState }
  }

  async removeCreatedUser(jobId: string, triggeredBy: string): Promise<void> {
    const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
    if (!job || !job.graphUserId) throw new Error('No user to remove')

    try {
      const { token } = await graphApiService.getAuthenticatedClient(job.entityId)
      await fetch(`https://graph.microsoft.com/v1.0/users/${job.graphUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error('Failed to remove Graph user:', err)
    }

    await prisma.provisioningJob.update({
      where: { id: jobId },
      data: { state: 'FAILED_AT_USER_CREATION', error: 'User removed by admin' },
    })

    await createAuditLog({
      actorId: triggeredBy,
      action: 'DELETE',
      target: `ProvisioningJob:${jobId}:user`,
      meta: { graphUserId: job.graphUserId, entityId: job.entityId },
    })
  }

  private async executeProvisioning(
    jobId: string,
    starter: StarterProvisioningFields,
    resumeFrom?: string | null,
    existingGraphUserId?: string | null
  ): Promise<ProvisioningResult> {
    const jobRow = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
    if (!jobRow) throw new Error('Job not found')

    // Graph / password rules use the job's Entra entity (may differ from starter entity)
    const graphEntityId = jobRow.entityId
    // License mapping defaults to starter's entity A
    const licenseEntityId = starter.entityId!

    try {
      // Step 1: License Check
      if (!resumeFrom || resumeFrom === 'FAILED_AT_LICENSE_CHECK') {
        await this.updateState(jobId, 'LICENSE_CHECKING')

        const licenseConfig = await this.resolveLicenseConfig(jobId, licenseEntityId, starter.roleTitle, graphEntityId)
        if (!licenseConfig) {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_CHECK', 'No license configuration found for this function')
        }
        if (licenseConfig.needsSelection) {
          return this.failJob(
            jobId,
            'FAILED_AT_LICENSE_CHECK',
            `LICENSE_SELECTION_REQUIRED:${JSON.stringify({
              reason: licenseConfig.reason,
              mappedSkuId: licenseConfig.mappedSkuId,
              mappedSkuDisplayName: licenseConfig.mappedSkuDisplayName,
            })}`
          )
        }

        const skuCheck = await this.checkSkuAvailability(graphEntityId, licenseConfig.skuId)
        if (skuCheck === 'not_found') {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_CHECK', `License "${licenseConfig.skuDisplayName}" is no longer available in the tenant subscription`)
        }
        if (skuCheck === 'no_capacity') {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_CHECK', `No available units for ${licenseConfig.skuDisplayName}`)
        }

        await prisma.provisioningJob.update({
          where: { id: jobId },
          data: { assignedLicenseType: licenseConfig.skuDisplayName },
        })
      }

      // Step 2: User Creation
      let graphUserId = existingGraphUserId
      if (!graphUserId && (!resumeFrom || resumeFrom === 'FAILED_AT_USER_CREATION')) {
        await this.updateState(jobId, 'USER_CREATING')

        const { token } = await graphApiService.getAuthenticatedClient(graphEntityId)
        const password = await this.generatePassword(graphEntityId)

        const upn = starter.desiredEmail || `${starter.firstName.toLowerCase()}.${starter.lastName.toLowerCase()}@placeholder.onmicrosoft.com`

        const res = await fetch('https://graph.microsoft.com/v1.0/users', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountEnabled: true,
            displayName: `${starter.firstName} ${starter.lastName}`,
            mailNickname: `${starter.firstName}.${starter.lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, ''),
            userPrincipalName: upn,
            usageLocation: 'BE',
            passwordProfile: { forceChangePasswordNextSignIn: false, password },
          }),
        })

        if (res.status === 409) {
          const body = await res.json()
          return this.failJob(jobId, 'FAILED_AT_USER_CREATION', `CONFLICT:${JSON.stringify(body)}`)
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          return this.failJob(jobId, 'FAILED_AT_USER_CREATION', body.error?.message || `User creation failed: ${res.status}`)
        }

        const user = await res.json()
        graphUserId = user.id

        const currentJob = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
        const prevResponses =
          currentJob?.graphApiResponses && typeof currentJob.graphApiResponses === 'object' && !Array.isArray(currentJob.graphApiResponses)
            ? (currentJob.graphApiResponses as Record<string, unknown>)
            : {}

        await prisma.provisioningJob.update({
          where: { id: jobId },
          data: {
            graphUserId: user.id,
            temporaryPassword: encryptEntra(password),
            graphApiResponses: { ...prevResponses, userCreation: { id: user.id, upn: user.userPrincipalName } },
          },
        })
      }

      // Step 3: License Assignment
      if (!resumeFrom || ['FAILED_AT_LICENSE_CHECK', 'FAILED_AT_USER_CREATION', 'FAILED_AT_LICENSE_ASSIGNMENT'].includes(resumeFrom)) {
        await this.updateState(jobId, 'LICENSE_ASSIGNING')

        const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
        if (!job?.graphUserId) {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_ASSIGNMENT', 'No Graph user ID available')
        }

        const licenseConfig = await this.resolveLicenseConfig(jobId, licenseEntityId, starter.roleTitle, graphEntityId)
        if (!licenseConfig || licenseConfig.needsSelection) {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_ASSIGNMENT', 'License configuration no longer found')
        }

        const { token } = await graphApiService.getAuthenticatedClient(graphEntityId)

        const res = await fetch(`https://graph.microsoft.com/v1.0/users/${job.graphUserId}/assignLicense`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ addLicenses: [{ skuId: licenseConfig.skuId }], removeLicenses: [] }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          return this.failJob(jobId, 'FAILED_AT_LICENSE_ASSIGNMENT', body.error?.message || 'License assignment failed')
        }
      }

      // Success!
      const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } })

      await prisma.provisioningJob.update({
        where: { id: jobId },
        data: { state: 'SUCCESS', completedAt: new Date() },
      })

      // Auto-complete the "mailadres" task for this starter
      await this.completeEmailTask(starter.id)

      await createAuditLog({
        actorId: (await prisma.provisioningJob.findUnique({ where: { id: jobId } }))?.triggeredBy || 'system',
        action: 'UPDATE',
        target: `ProvisioningJob:${jobId}`,
        meta: { state: 'SUCCESS', starterId: starter.id },
      })

      return { jobId, state: 'SUCCESS', assignedLicenseType: job?.assignedLicenseType || undefined }
    } catch (err: any) {
      const currentJob = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
      const failState = this.mapToFailState(currentJob?.state || 'PENDING')
      return this.failJob(jobId, failState, err.message)
    }
  }

  private async updateState(jobId: string, state: ProvisioningState) {
    await prisma.provisioningJob.update({ where: { id: jobId }, data: { state } })
  }

  private async failJob(jobId: string, state: ProvisioningState, error: string): Promise<ProvisioningResult> {
    await prisma.provisioningJob.update({
      where: { id: jobId },
      data: { state, error, completedAt: new Date() },
    })
    return { jobId, state, error }
  }

  private mapToFailState(currentState: string): ProvisioningState {
    const map: Record<string, ProvisioningState> = {
      'LICENSE_CHECKING': 'FAILED_AT_LICENSE_CHECK',
      'USER_CREATING': 'FAILED_AT_USER_CREATION',
      'LICENSE_ASSIGNING': 'FAILED_AT_LICENSE_ASSIGNMENT',
      'TAP_CREATING': 'FAILED_AT_TAP',
      'MAILBOX_WAITING': 'FAILED_AT_MAILBOX_WAIT',
    }
    return map[currentState] || 'FAILED_AT_LICENSE_CHECK'
  }

  private getSelectedSkuFromJob(job: { graphApiResponses: unknown; assignedLicenseType: string | null }) {
    const responses =
      job.graphApiResponses && typeof job.graphApiResponses === 'object' && !Array.isArray(job.graphApiResponses)
        ? (job.graphApiResponses as Record<string, unknown>)
        : {}
    const skuId = typeof responses.selectedSkuId === 'string' ? responses.selectedSkuId : null
    const displayName =
      (typeof responses.selectedSkuDisplayName === 'string' && responses.selectedSkuDisplayName) ||
      job.assignedLicenseType ||
      null
    return skuId ? { skuId, skuDisplayName: displayName || skuId } : null
  }

  /**
   * Resolve license: job override → mapped config from starter entity A if available on graph entity → needs selection.
   */
  private async resolveLicenseConfig(
    jobId: string,
    starterEntityId: string,
    roleTitle: string | null,
    graphEntityId: string
  ): Promise<
    | { needsSelection: false; skuId: string; skuDisplayName: string }
    | { needsSelection: true; reason: string; mappedSkuId?: string; mappedSkuDisplayName?: string }
    | null
  > {
    const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
    if (!job) return null

    const selected = this.getSelectedSkuFromJob(job)
    if (selected) {
      return { needsSelection: false, ...selected }
    }

    const mapped = await this.getLicenseConfig(starterEntityId, roleTitle)
    if (!mapped) return null

    // Same tenant as mapping source: use mapped SKU directly
    if (graphEntityId === starterEntityId) {
      return { needsSelection: false, ...mapped }
    }

    const availability = await this.checkSkuAvailability(graphEntityId, mapped.skuId)
    if (availability === 'available') {
      return { needsSelection: false, ...mapped }
    }

    return {
      needsSelection: true,
      reason: availability === 'no_capacity' ? 'no_capacity' : 'not_found',
      mappedSkuId: mapped.skuId,
      mappedSkuDisplayName: mapped.skuDisplayName,
    }
  }

  private async getLicenseConfig(entityId: string, roleTitle: string | null) {
    if (!roleTitle) return null

    const jobRole = await prisma.jobRole.findFirst({
      where: { entityId, title: roleTitle },
      include: { licenseConfig: true },
    })

    if (!jobRole?.licenseConfig) return null

    return {
      skuId: jobRole.licenseConfig.skuId,
      skuDisplayName: jobRole.licenseConfig.skuDisplayName,
    }
  }

  private async checkSkuAvailability(entityId: string, skuId: string): Promise<'available' | 'not_found' | 'no_capacity'> {
    const skus = await graphApiService.getSubscribedSkus(entityId)
    const target = skus.find(s => s.skuId === skuId)
    if (!target) return 'not_found'
    return skuAvailableUnits(target) > 0 ? 'available' : 'no_capacity'
  }

  private async generatePassword(entityId: string): Promise<string> {
    const config = await prisma.tenantEntraConfig.findUnique({ where: { entityId } })

    if (config?.fixedInitialPassword) {
      try {
        return decryptEntra(config.fixedInitialPassword)
      } catch (err) {
        throw new Error('Fixed initial password could not be decrypted. Please re-save it in the Entra configuration.')
      }
    }

    const minLength = config?.passwordMinLength || 16
    const requireUpper = config?.passwordRequireUppercase ?? true
    const requireNumbers = config?.passwordRequireNumbers ?? true
    const requireSpecial = config?.passwordRequireSpecialChars ?? true

    const lower = 'abcdefghijkmnpqrstuvwxyz'
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const digits = '23456789'
    const special = '!@#$%&*-_=+'

    let charset = lower
    const required: string[] = []

    if (requireUpper) { charset += upper; required.push(upper[randomBytes(1)[0] % upper.length]) }
    if (requireNumbers) { charset += digits; required.push(digits[randomBytes(1)[0] % digits.length]) }
    if (requireSpecial) { charset += special; required.push(special[randomBytes(1)[0] % special.length]) }

    const remaining = minLength - required.length
    const bytes = randomBytes(remaining)
    const chars = required.concat(Array.from(bytes).map(b => charset[b % charset.length]))

    // Shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomBytes(1)[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]]
    }

    return chars.join('')
  }

  private async completeEmailTask(starterId: string): Promise<void> {
    try {
      const emailTask = await prisma.task.findFirst({
        where: {
          starterId,
          type: 'IT_SETUP',
          title: { contains: 'mailadres', mode: 'insensitive' },
          status: { not: 'COMPLETED' },
        },
      })
      if (emailTask) {
        await prisma.task.update({
          where: { id: emailTask.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        })
      }
    } catch (err) {
      console.error('Failed to auto-complete email task:', err)
    }
  }
}

export const provisioningEngine = new ProvisioningEngine()
