import { prisma } from '@/lib/prisma'
import { graphApiService } from '@/lib/graph-api-service'
import { encryptEntra } from '@/lib/encryption'
import { createAuditLog } from '@/lib/audit'
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
        state: { notIn: ['SUCCESS', 'FAILED_AT_LICENSE_CHECK', 'FAILED_AT_USER_CREATION', 'FAILED_AT_LICENSE_ASSIGNMENT', 'FAILED_AT_TAP', 'FAILED_AT_MAILBOX_WAIT'] },
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

        const skuCheck = await this.checkSkuAvailability(entityId, licenseConfig.skuId)
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

        const licenseConfig = await this.getLicenseConfig(entityId, starter.roleTitle)
        if (!licenseConfig) {
          return this.failJob(jobId, 'FAILED_AT_LICENSE_ASSIGNMENT', 'License configuration no longer found')
        }

        const { token } = await graphApiService.getAuthenticatedClient(entityId)

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

      // Step 4: Create Temporary Access Pass (TAP)
      if (!resumeFrom || ['FAILED_AT_LICENSE_CHECK', 'FAILED_AT_USER_CREATION', 'FAILED_AT_LICENSE_ASSIGNMENT', 'FAILED_AT_TAP'].includes(resumeFrom)) {
        await this.updateState(jobId, 'TAP_CREATING')

        const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } })
        if (!job?.graphUserId) {
          return this.failJob(jobId, 'FAILED_AT_TAP', 'No Graph user ID available for TAP creation')
        }

        const { token } = await graphApiService.getAuthenticatedClient(entityId)

        const tapRes = await fetch(
          `https://graph.microsoft.com/v1.0/users/${job.graphUserId}/authentication/temporaryAccessPassMethods`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isUsableOnce: true, lifetimeInMinutes: 60 }),
          }
        )

        if (!tapRes.ok) {
          const body = await tapRes.json().catch(() => ({}))
          return this.failJob(jobId, 'FAILED_AT_TAP', body.error?.message || `TAP creation failed: ${tapRes.status}`)
        }

        const tapData = await tapRes.json()

        await prisma.provisioningJob.update({
          where: { id: jobId },
          data: { temporaryPassword: encryptEntra(tapData.temporaryAccessPass) },
        })
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
    return target.prepaidUnits.enabled - target.consumedUnits > 0 ? 'available' : 'no_capacity'
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
