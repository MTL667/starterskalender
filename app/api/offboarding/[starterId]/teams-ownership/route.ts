import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { graphApiService } from '@/lib/graph-api-service'
import { findGraphUserIdForStarter } from '@/lib/offboarding-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true, firstName: true, lastName: true, desiredEmail: true },
  })

  if (!starter?.entityId) {
    return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
  }

  try {
    await requirePermission('mail:offboarding', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const graphUserId = await findGraphUserIdForStarter(starterId, starter.entityId, starter.firstName, starter.lastName, starter.desiredEmail)
  if (!graphUserId) {
    return NextResponse.json({ error: 'No provisioned mailbox found' }, { status: 400 })
  }

  const groups = await graphApiService.getUserOwnedGroups(starter.entityId, graphUserId)
  return NextResponse.json({ groups, entityId: starter.entityId })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true },
  })

  if (!starter?.entityId) {
    return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
  }

  try {
    await requirePermission('mail:offboarding', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { mapping } = body

  if (!Array.isArray(mapping)) {
    return NextResponse.json({ error: 'Invalid mapping format' }, { status: 400 })
  }

  await prisma.starter.update({
    where: { id: starterId },
    data: { teamsOwnershipMapping: mapping },
  })

  const job = await prisma.offboardingJob.findFirst({
    where: { starterId, state: { notIn: ['COMPLETED', 'ROLLED_BACK'] } },
    orderBy: { createdAt: 'desc' },
  })

  if (job) {
    await prisma.offboardingJob.update({
      where: { id: job.id },
      data: {
        teamsOwnershipMapping: mapping,
        state: 'TEAMS_TRANSFER_PENDING',
      },
    })
  }

  return NextResponse.json({ success: true })
}
