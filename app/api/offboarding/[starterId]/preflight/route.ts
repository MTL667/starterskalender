import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { runPreFlightChecks } from '@/lib/offboarding-preflight'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: {
      entityId: true,
      provisioningJobs: {
        where: { state: 'SUCCESS', graphUserId: { not: null } },
        select: { graphUserId: true },
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!starter?.entityId) {
    return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
  }

  try {
    await requirePermission('mail:offboarding', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const graphUserId = starter.provisioningJobs?.[0]?.graphUserId
  if (!graphUserId) {
    return NextResponse.json({ error: 'Starter has no provisioned mailbox' }, { status: 400 })
  }

  const result = await runPreFlightChecks(starter.entityId, starterId, graphUserId)
  return NextResponse.json(result)
}
