import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(
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
    where: { starterId, state: { not: 'ROLLED_BACK' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      state: true,
      currentStep: true,
      error: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      preFlightResults: true,
    },
  })

  return NextResponse.json({ job })
}
