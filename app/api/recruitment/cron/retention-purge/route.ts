import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { verifyCronAuth } from '@/lib/cron-auth'
import { createHash } from 'crypto'

export async function POST(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const entities = await prisma.entity.findMany({
    select: { id: true, retentionGraceDays: true },
  })

  let purged = 0

  for (const entity of entities) {
    const graceThreshold = new Date(Date.now() - entity.retentionGraceDays * 86400000)

    const candidates = await prisma.candidate.findMany({
      where: {
        deletedAt: { not: null, lte: graceThreshold },
        status: 'RETENTION_EXPIRED',
        vacancy: { entityId: entity.id },
      },
      select: { id: true },
    })

    for (const candidate of candidates) {
      try {
        const anonId = `anon-${createHash('sha256').update(candidate.id).digest('hex').slice(0, 12)}`

        await prisma.$transaction(async (tx) => {
          await tx.auditLog.updateMany({
            where: { target: candidate.id },
            data: { target: anonId },
          })

          await tx.candidateComment.deleteMany({ where: { candidateId: candidate.id } })
          await tx.linkedEmail.deleteMany({ where: { candidateId: candidate.id } })
          await tx.evaluation.deleteMany({ where: { candidateId: candidate.id } })
          await tx.candidateShare.deleteMany({ where: { candidateId: candidate.id } })
          await tx.candidateApplication.deleteMany({ where: { candidateId: candidate.id } })
          await tx.candidate.delete({ where: { id: candidate.id } })
        })

        await createAuditLog({
          action: 'CANDIDATE_DATA_PURGED',
          target: anonId,
          meta: { purgedAt: new Date().toISOString() },
        })

        purged++
      } catch (err) {
        console.error(`Purge failed for candidate ${candidate.id}:`, err)
      }
    }
  }

  return NextResponse.json({ data: { purged } })
}
