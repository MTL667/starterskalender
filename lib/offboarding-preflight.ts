import { prisma } from '@/lib/prisma'
import { graphApiService, GraphApiError } from '@/lib/graph-api-service'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface PreFlightResult {
  litigationHold: boolean
  mailboxSizeMb: number
  teamsOwnerships: { groupId: string; groupName: string }[]
  graphApiHealthy: boolean
  graphApiError?: string
  checkedAt: string
  allClear: boolean
}

export async function runPreFlightChecks(entityId: string, starterId: string, graphUserId: string): Promise<PreFlightResult> {
  const job = await prisma.offboardingJob.findFirst({
    where: { starterId, state: { not: 'ROLLED_BACK' } },
    orderBy: { createdAt: 'desc' },
  })

  if (job?.preFlightResults) {
    const cached = job.preFlightResults as unknown as PreFlightResult
    const age = Date.now() - new Date(cached.checkedAt).getTime()
    if (age < CACHE_TTL_MS) return cached
  }

  let litigationHold = false
  let mailboxSizeMb = 0
  let teamsOwnerships: { groupId: string; groupName: string }[] = []
  let graphApiHealthy = true
  let graphApiError: string | undefined

  try {
    const [holdResult, statsResult, groupsResult] = await Promise.all([
      graphApiService.checkLitigationHold(entityId, graphUserId).catch(() => false),
      graphApiService.getMailboxStatistics(entityId, graphUserId).catch(() => ({ mailboxSizeMb: 0 })),
      graphApiService.getUserOwnedGroups(entityId, graphUserId).catch(() => []),
    ])

    litigationHold = holdResult
    mailboxSizeMb = statsResult.mailboxSizeMb
    teamsOwnerships = groupsResult
  } catch (err: any) {
    graphApiHealthy = false
    graphApiError = err instanceof GraphApiError ? err.message : 'Graph API unreachable'
  }

  const result: PreFlightResult = {
    litigationHold,
    mailboxSizeMb,
    teamsOwnerships,
    graphApiHealthy,
    graphApiError,
    checkedAt: new Date().toISOString(),
    allClear: graphApiHealthy && !litigationHold && mailboxSizeMb < 50000,
  }

  if (job) {
    await prisma.offboardingJob.update({
      where: { id: job.id },
      data: { preFlightResults: result as any },
    })
  }

  return result
}
