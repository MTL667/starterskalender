import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { offboardingEngine } from '@/lib/offboarding-engine'

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
    where: {
      starterId,
      state: { in: [
        'BLOCKED_AT_OOO', 'BLOCKED_AT_LOGIN_BLOCK', 'BLOCKED_AT_REVOKE_SESSIONS',
        'BLOCKED_AT_CALENDAR', 'BLOCKED_AT_TEAMS_TRANSFER', 'BLOCKED_AT_GROUPS',
        'BLOCKED_AT_FORWARDING', 'BLOCKED_AT_DELEGATES', 'BLOCKED_AT_SIZE_CHECK',
        'BLOCKED_AT_CONVERSION', 'BLOCKED_AT_LICENSE_REMOVAL',
      ] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!job) {
    return NextResponse.json({ error: 'No blocked offboarding job found' }, { status: 400 })
  }

  try {
    const result = await offboardingEngine.retryOffboarding(job.id, user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
