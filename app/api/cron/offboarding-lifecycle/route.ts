import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { prisma } from '@/lib/prisma'
import { graphApiService } from '@/lib/graph-api-service'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  const results = { renamed: 0, deleted: 0, errors: 0 }

  const jobsToRename = await prisma.offboardingJob.findMany({
    where: {
      state: 'COMPLETED',
      completedAt: { lte: oneDayAgo },
      graphUserId: { not: null },
    },
    include: { starter: { select: { firstName: true, lastName: true } } },
  })

  for (const job of jobsToRename) {
    if (!job.graphUserId) continue

    const responses = (job.graphApiResponses as any[]) || []
    if (responses.some((r) => r.step === 'LIFECYCLE_RENAMED')) continue

    const date = job.completedAt?.toISOString().split('T')[0] || 'unknown'

    let domain = 'onmicrosoft.com'
    try {
      const { token } = await graphApiService.getAuthenticatedClient(job.entityId)
      const userRes = await fetch(`https://graph.microsoft.com/v1.0/users/${job.graphUserId}?$select=userPrincipalName`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        const parts = (userData.userPrincipalName || '').split('@')
        if (parts[1]) domain = parts[1]
      }
    } catch {}

    const newUpn = `ZZ-Archived-${job.starter?.lastName || 'unknown'}-${date}@${domain}`

    try {
      await graphApiService.renameMailbox(job.entityId, job.graphUserId, newUpn)

      responses.push({ step: 'LIFECYCLE_RENAMED', success: true, timestamp: now.toISOString() })
      await prisma.offboardingJob.update({
        where: { id: job.id },
        data: { graphApiResponses: responses },
      })

      await createAuditLog({
        action: 'entra.offboarding.lifecycle_renamed',
        target: `OffboardingJob:${job.id}`,
        meta: { starterId: job.starterId, newUpn },
      })

      results.renamed++
    } catch (err: any) {
      results.errors++
      console.error(`Lifecycle rename failed for job ${job.id}:`, err.message)
    }
  }

  const jobsToDelete = await prisma.offboardingJob.findMany({
    where: {
      state: 'COMPLETED',
      completedAt: { lte: oneYearAgo },
      graphUserId: { not: null },
    },
  })

  for (const job of jobsToDelete) {
    const responses = (job.graphApiResponses as any[]) || []
    if (responses.some((r) => r.step === 'LIFECYCLE_DELETED')) continue
    if (!responses.some((r) => r.step === 'LIFECYCLE_RENAMED')) continue

    try {
      const { token } = await graphApiService.getAuthenticatedClient(job.entityId)
      await fetch(`https://graph.microsoft.com/v1.0/users/${job.graphUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      responses.push({ step: 'LIFECYCLE_DELETED', success: true, timestamp: now.toISOString() })
      await prisma.offboardingJob.update({
        where: { id: job.id },
        data: { graphApiResponses: responses },
      })

      await createAuditLog({
        action: 'entra.offboarding.lifecycle_deleted',
        target: `OffboardingJob:${job.id}`,
        meta: { starterId: job.starterId },
      })

      results.deleted++
    } catch (err: any) {
      results.errors++
      console.error(`Lifecycle delete failed for job ${job.id}:`, err.message)
    }
  }

  return NextResponse.json({ success: true, ...results })
}
