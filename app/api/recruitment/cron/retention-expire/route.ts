import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function POST(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

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
