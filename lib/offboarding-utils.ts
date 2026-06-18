import { prisma } from '@/lib/prisma'
import { graphApiService } from '@/lib/graph-api-service'

/**
 * Find the Graph User ID for an offboarding starter.
 * Strategy:
 * 1. Check if there's already an OffboardingJob with graphUserId for this starter
 * 2. Look for a matching onboarding/migration starter with the same name+entity that has a provisioning job
 * 3. Look up the user via Graph API using the desiredEmail (UPN)
 */
export async function findGraphUserIdForStarter(
  starterId: string,
  entityId: string,
  firstName: string,
  lastName: string,
  desiredEmail: string | null
): Promise<string | null> {
  const existingJob = await prisma.offboardingJob.findFirst({
    where: { starterId, graphUserId: { not: null } },
    select: { graphUserId: true },
    orderBy: { createdAt: 'desc' },
  })
  if (existingJob?.graphUserId) return existingJob.graphUserId

  const originalStarter = await prisma.starter.findFirst({
    where: {
      firstName,
      lastName,
      entityId,
      type: { in: ['ONBOARDING', 'MIGRATION'] },
      provisioningJobs: {
        some: { state: 'SUCCESS', graphUserId: { not: null } },
      },
    },
    select: {
      provisioningJobs: {
        where: { state: 'SUCCESS', graphUserId: { not: null } },
        select: { graphUserId: true },
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
  })
  if (originalStarter?.provisioningJobs?.[0]?.graphUserId) {
    return originalStarter.provisioningJobs[0].graphUserId
  }

  if (desiredEmail) {
    try {
      const { token } = await graphApiService.getAuthenticatedClient(entityId)
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(desiredEmail)}?$select=id`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.id) return data.id
      }
    } catch {}
  }

  return null
}
