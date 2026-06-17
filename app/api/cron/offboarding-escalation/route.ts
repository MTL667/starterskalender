import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const starters = await prisma.starter.findMany({
    where: {
      type: 'OFFBOARDING',
      startDate: { lte: threeDaysFromNow, gte: now },
      provisioningJobs: {
        some: { state: 'COMPLETED', graphUserId: { not: null } },
      },
      offboardingJobs: {
        none: { state: 'COMPLETED' },
      },
    },
    select: {
      id: true,
      entityId: true,
      firstName: true,
      lastName: true,
      startDate: true,
      offboardingJobs: {
        where: { state: { notIn: ['COMPLETED', 'ROLLED_BACK'] } },
        select: { id: true, state: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  let escalated = 0

  for (const starter of starters) {
    if (!starter.entityId) continue

    const existingEscalation = await prisma.task.findFirst({
      where: {
        starterId: starter.id,
        type: 'OFFBOARDING_ESCALATION',
        completedAt: null,
      },
    })

    if (existingEscalation) continue

    await prisma.task.create({
      data: {
        type: 'OFFBOARDING_ESCALATION',
        starterId: starter.id,
        entityId: starter.entityId,
        title: `Offboarding escalatie: ${starter.firstName} ${starter.lastName}`,
        description: `Mailbox offboarding niet afgerond voor uitdiensttredingsdatum ${starter.startDate?.toLocaleDateString('nl-BE')}`,
        priority: 'HIGH',
      },
    })

    await createAuditLog({
      action: 'entra.offboarding.escalated',
      target: `Starter:${starter.id}`,
      meta: { entityId: starter.entityId, startDate: starter.startDate },
    })

    escalated++
  }

  return NextResponse.json({ success: true, escalated })
}
