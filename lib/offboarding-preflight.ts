import { prisma } from '@/lib/prisma'
import { graphApiService, GraphApiError } from '@/lib/graph-api-service'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface PreFlightResult {
  litigationHold: boolean
  mailboxSizeMb: number
  teamsOwnerships: { groupId: string; groupName: string }[]
  graphApiHealthy: boolean
  graphApiError?: string
  oooTemplateConfigured: boolean
  checkedAt: string
  allClear: boolean
}

export async function runPreFlightChecks(entityId: string, starterId: string, graphUserId: string, roleTitle?: string | null): Promise<PreFlightResult> {
  const job = await prisma.offboardingJob.findFirst({
    where: { starterId, state: { not: 'ROLLED_BACK' } },
    orderBy: { createdAt: 'desc' },
  })

  let jobRoleId: string | undefined
  if (roleTitle) {
    const jobRole = await prisma.jobRole.findFirst({
      where: { entityId, title: roleTitle },
      select: { id: true },
    })
    jobRoleId = jobRole?.id
  }

  const [oooTemplate, starter] = await Promise.all([
    prisma.oooTemplate.findFirst({
      where: {
        entityId,
        OR: [
          ...(jobRoleId ? [{ jobRoleId }] : []),
          { jobRoleId: null },
        ],
      },
      select: { id: true },
    }),
    prisma.starter.findUnique({
      where: { id: starterId },
      select: { oooMessageNl: true, oooMessageFr: true, oooMessageEn: true },
    }),
  ])
  const hasPerStarterOoo = !!(starter?.oooMessageNl || starter?.oooMessageFr || starter?.oooMessageEn)
  const oooTemplateConfigured = !!oooTemplate || hasPerStarterOoo

  if (job?.preFlightResults) {
    const cached = job.preFlightResults as unknown as PreFlightResult
    const age = Date.now() - new Date(cached.checkedAt).getTime()
    if (age < CACHE_TTL_MS) return { ...cached, oooTemplateConfigured }
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

    const starterData = await prisma.starter.findUnique({
      where: { id: starterId },
      select: { teamsOwnershipMapping: true },
    })
    const existingMapping = (starterData?.teamsOwnershipMapping as any[]) || []
    if (existingMapping.length > 0) {
      const mappedGroupIds = new Set(existingMapping.map((m: any) => m.groupId))
      teamsOwnerships = teamsOwnerships.filter(g => !mappedGroupIds.has(g.groupId))
    }
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
    oooTemplateConfigured,
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
