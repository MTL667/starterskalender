import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function POST() {
  const headersList = await headers()
  const cronSecret = headersList.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const expired = await prisma.candidate.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      retentionExpiresAt: { lte: now },
    },
    select: { id: true },
  })

  let processed = 0
  for (const candidate of expired) {
    try {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { status: 'RETENTION_EXPIRED', deletedAt: now },
      })
      await createAuditLog({
        action: 'CANDIDATE_RETENTION_EXPIRED',
        target: candidate.id,
        meta: { retentionExpiresAt: now.toISOString() },
      })
      processed++
    } catch { /* continue with next */ }
  }

  return NextResponse.json({ data: { expired: expired.length, processed } })
}
