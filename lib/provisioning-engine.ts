import { prisma } from '@/lib/prisma'
import { LicenseType } from '@prisma/client'
import { graphApiService, GraphAuthError, GraphTransientError, GraphRateLimitError, GraphApiError } from '@/lib/graph-api-service'
import { encryptEntra } from '@/lib/encryption'
import { createAuditLog } from '@/lib/audit'
import { randomBytes } from 'crypto'

type ProvisioningState = 'PENDING' | 'LICENSE_CHECKING' | 'USER_CREATING' | 'LICENSE_ASSIGNING' | 'MAILBOX_WAITING' | 'SUCCESS' | 'FAILED_AT_LICENSE_CHECK' | 'FAILED_AT_USER_CREATION' | 'FAILED_AT_LICENSE_ASSIGNMENT' | 'FAILED_AT_MAILBOX_WAIT'

interface ProvisioningResult {
  jobId: string
  state: ProvisioningState
  email?: string
  temporaryPassword?: string
  error?: string
  assignedLicenseType?: string
}

export class ProvisioningEngine {
  async startProvisioning(starterId: string, triggeredBy: string): Promise<ProvisioningResult> {
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
        state: { notIn: ['SUCCESS', 'FAILED_AT_LICENSE_CHECK', 'FAILED_AT_USER_CREATION', 'FAILED_AT_LICENSE_ASSIGNMENT', 'FAILED_AT_MAILBOX_WAIT'] },
      },
    })

    if (activeJob) {
      throw new Error('Provisioning already in progress for this starter')
    }

    const job = await prisma.provisioningJob.create({
      data: {
        starterId,
        entityId: starter.entityId,
        state: 'PENDING',
        triggeredBy,
      },
    })

    await createAuditLog({
      actorId: triggeredBy,
      action: 'CREATE',
      target: `ProvisioningJob:${job.id}`,
      meta: { starterId, entityId: starter.entityId },
    })

    // Fire and forget - provisioning runs async, SSE endpoint tracks progress
    this.executeProvisioning(job.id, starter).catch((err) => {
      console.error(`Provisioning job ${job.id} failed unexpectedly:`, err)
    })

    return { jobId: job.id, state: 'PENDING' as ProvisioningState }
  }

  async retryProvisioning(jobId: string, triggeredBy: string): Promise<ProvisioningResult> {
    const failedJob = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
    if (!failedJob) throw new Error('Job not found')

    const starter = await prisma.starter.findUnique({
      where: { id: failedJob.starterId },
      select: { id: true, entityId: true, firstName: true, lastName: true, desiredEmail: true, roleTitle: true },
    })

    if (!starter || !starter.entityId) throw new Error('Starter not found')

    const newJob = await prisma.provisioningJob.create({
      data: {
        starterId: failedJob.starterId,
        entityId: failedJob.entityId,
        state: 'PENDING',
        triggeredBy,
        graphUserId: failedJob.graphUserId,
        assignedLicenseType: failedJob.assignedLicenseType,
      },
    })

    await createAuditLog({
      actorId: triggeredBy,
      action: 'UPDATE',
      target: `ProvisioningJob:${newJob.id}`,
      meta: { retryOf: jobId, starterId: failedJob.starterId },
    })

    this.executeProvisioning(newJob.id, starter, failedJob.state, failedJob.graphUserId).catch((err) => {
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
    starter: { id: string; entityId: string | null; firstName: string; lastName: string; desiredEmail: string | null; roleTitle: string | null },
    resumeFrom?: string | null,
    existingGraphUserId?: string | null
  ): Promise<ProvisioningResult> {
    const entityId = starter.entityId!

    try {
      // Step 1: License Check
      if (!resumeFrom || resumeFrom === 'FAILED_AT_LICENSE_CHECK') {
        await this.updateState(jobId, 'LICENSE_CHECKING')

        const licenseConfig = await this.getLicenseConfig(entityId, starter.roleTitle)
        if (!licenseConfig) {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_CHECK', 'No license configuration found for this function')
        }

        const skuId = await this.checkLicenseAvailability(entityId, licenseConfig.requiredLicenseType, licenseConfig.trickleDownEnabled)
        if (!skuId) {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_CHECK', `No ${licenseConfig.requiredLicenseType} licenses available`)
        }

        await prisma.provisioningJob.update({
          where: { id: jobId },
          data: { assignedLicenseType: skuId.licenseType as LicenseType },
        })
      }

      // Step 2: User Creation
      let graphUserId = existingGraphUserId
      if (!graphUserId && (!resumeFrom || resumeFrom === 'FAILED_AT_USER_CREATION')) {
        await this.updateState(jobId, 'USER_CREATING')

        const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
        const { token } = await graphApiService.getAuthenticatedClient(entityId)
        const password = await this.generatePassword(entityId)

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
            passwordProfile: { forceChangePasswordNextSignIn: true, password },
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

        await prisma.provisioningJob.update({
          where: { id: jobId },
          data: {
            graphUserId: user.id,
            temporaryPassword: encryptEntra(password),
            graphApiResponses: { userCreation: { id: user.id, upn: user.userPrincipalName } },
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

        const { token } = await graphApiService.getAuthenticatedClient(entityId)
        const skus = await graphApiService.getSubscribedSkus(entityId)
        const targetSku = skus.find(s => s.prepaidUnits.enabled - s.consumedUnits > 0)

        if (!targetSku) {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_ASSIGNMENT', 'No available licenses')
        }

        const res = await fetch(`https://graph.microsoft.com/v1.0/users/${job.graphUserId}/assignLicense`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ addLicenses: [{ skuId: targetSku.skuId }], removeLicenses: [] }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          return this.failJob(jobId, 'FAILED_AT_LICENSE_ASSIGNMENT', body.error?.message || 'License assignment failed')
        }
      }

      // Step 4: Mailbox Waiting
      await this.updateState(jobId, 'MAILBOX_WAITING')

      // Mailbox provisioning typically takes 30-60s. Poll a few times.
      const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
      let mailboxReady = false
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 10000))
        const { token } = await graphApiService.getAuthenticatedClient(entityId)
        const res = await fetch(`https://graph.microsoft.com/v1.0/users/${job?.graphUserId}/mailboxSettings`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          mailboxReady = true
          break
        }
      }

      if (!mailboxReady) {
        return this.failJob(jobId, 'FAILED_AT_MAILBOX_WAIT', 'Mailbox not ready after 60 seconds')
      }

      // Success!
      await prisma.provisioningJob.update({
        where: { id: jobId },
        data: { state: 'SUCCESS', completedAt: new Date() },
      })

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
      'MAILBOX_WAITING': 'FAILED_AT_MAILBOX_WAIT',
    }
    return map[currentState] || 'FAILED_AT_LICENSE_CHECK'
  }

  private async getLicenseConfig(entityId: string, roleTitle: string | null) {
    if (!roleTitle) return null

    const jobRole = await prisma.jobRole.findFirst({
      where: { entityId, title: roleTitle },
      include: { licenseConfig: true },
    })

    if (!jobRole?.licenseConfig) return null

    const tenantConfig = await prisma.tenantEntraConfig.findUnique({ where: { entityId } })
    const trickleDownEnabled = jobRole.licenseConfig.trickleDownOverride ?? tenantConfig?.trickleDownEnabled ?? false

    return {
      requiredLicenseType: jobRole.licenseConfig.requiredLicenseType,
      trickleDownEnabled,
    }
  }

  private async checkLicenseAvailability(entityId: string, requiredType: string, trickleDownEnabled: boolean) {
    const skus = await graphApiService.getSubscribedSkus(entityId)

    const SKU_MAP: Record<string, string[]> = {
      BUSINESS_STANDARD: [
        'O365_BUSINESS_PREMIUM',
        'SMB_BUSINESS',
        'SPB',
        'MICROSOFT_365_BUSINESS_STANDARD',
        'M365_BUSINESS_STANDARD',
      ],
      BUSINESS_BASIC: [
        'O365_BUSINESS_ESSENTIALS',
        'SMB_BUSINESS_ESSENTIALS',
        'MICROSOFT_365_BUSINESS_BASIC',
        'M365_BUSINESS_BASIC',
      ],
    }

    const validSkuPartNumbers = SKU_MAP[requiredType] || []

    const primarySku = skus.find(s =>
      validSkuPartNumbers.some(pn => s.skuPartNumber.toUpperCase() === pn) &&
      s.prepaidUnits.enabled - s.consumedUnits > 0
    )

    if (primarySku) return { skuId: primarySku.skuId, licenseType: requiredType }

    if (trickleDownEnabled && requiredType === 'BUSINESS_STANDARD') {
      const basicSkuPartNumbers = SKU_MAP['BUSINESS_BASIC'] || []
      const fallbackSku = skus.find(s =>
        basicSkuPartNumbers.some(pn => s.skuPartNumber.toUpperCase() === pn) &&
        s.prepaidUnits.enabled - s.consumedUnits > 0
      )
      if (fallbackSku) return { skuId: fallbackSku.skuId, licenseType: 'BUSINESS_BASIC' }
    }

    return null
  }

  private async generatePassword(entityId: string): Promise<string> {
    const config = await prisma.tenantEntraConfig.findUnique({ where: { entityId } })
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
}

export const provisioningEngine = new ProvisioningEngine()
