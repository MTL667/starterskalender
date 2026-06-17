import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

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

  let user
  try {
    user = await requirePermission('mail:offboarding', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const job = await prisma.offboardingJob.findFirst({
    where: { starterId, state: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
  })

  if (!job) {
    return NextResponse.json({ error: 'No completed offboarding job to rollback' }, { status: 400 })
  }

  await prisma.offboardingJob.update({
    where: { id: job.id },
    data: { state: 'ROLLED_BACK' },
  })

  await createAuditLog({
    actorId: user.id,
    action: 'entra.offboarding.rolled_back',
    target: `OffboardingJob:${job.id}`,
    meta: { starterId, entityId: starter.entityId },
  })

  return NextResponse.json({ success: true, jobId: job.id })
}
