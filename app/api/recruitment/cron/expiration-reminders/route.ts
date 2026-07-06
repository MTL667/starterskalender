import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function POST(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const expiringShares = await prisma.candidateShare.findMany({
    where: {
      revokedAt: null,
      evaluationSubmittedAt: null,
      expirationNotifiedAt: null,
      expiresAt: { gt: now, lte: in24h },
    },
    include: {
      candidate: { select: { firstName: true, lastName: true } },
      sharedWith: { select: { id: true } },
    },
  })

  let notified = 0
  for (const share of expiringShares) {
    try {
      await prisma.notification.create({
        data: {
          userId: share.sharedWith.id,
          type: 'RECRUITMENT_SHARE_EXPIRING',
          title: 'Toegang verloopt morgen',
          message: `Je toegang tot ${share.candidate.firstName} ${share.candidate.lastName} verloopt morgen.`,
          linkUrl: `/recruitment/shared/${share.token}`,
        },
      })
      await prisma.candidateShare.update({
        where: { id: share.id },
        data: { expirationNotifiedAt: now },
      })
      eventBus.emit({ type: 'notification:new', entityId: '*', payload: { userId: share.sharedWith.id } })
      notified++
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ data: { checked: expiringShares.length, notified } })
}
