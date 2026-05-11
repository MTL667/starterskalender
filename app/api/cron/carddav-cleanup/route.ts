import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/cron-auth'
import { decryptConfig, deleteContact } from '@/lib/carddav'
import { createAuditLog } from '@/lib/audit'

const SOFT_DELETE_RETENTION_DAYS = 30

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - SOFT_DELETE_RETENTION_DAYS)

    const candidates = await prisma.starter.findMany({
      where: {
        cardDavStatus: 'SOFT_DELETED',
        cardDavSyncedAt: { lte: cutoff },
        cardDavUid: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cardDavUid: true,
        entityId: true,
        entity: {
          select: {
            cardDavEnabled: true,
            cardDavUrl: true,
            cardDavUsername: true,
            cardDavPasswordEnc: true,
            cardDavAddressBook: true,
          },
        },
      },
      take: 100,
    })

    let deleted = 0
    let failed = 0

    for (const starter of candidates) {
      if (!starter.entity || !starter.cardDavUid || !starter.entity.cardDavEnabled) continue

      try {
        const config = decryptConfig(starter.entity)
        const result = await deleteContact(config, starter.cardDavUid)

        if (result.success) {
          await prisma.starter.update({
            where: { id: starter.id },
            data: { cardDavStatus: 'DELETED', cardDavUid: null, cardDavSyncedAt: null },
          })
          deleted++
        } else {
          console.warn(`CardDAV cleanup failed for ${starter.id}: ${result.error}`)
          failed++
        }
      } catch (err) {
        console.warn(`CardDAV cleanup error for ${starter.id}:`, (err as Error).message)
        failed++
      }
    }

    if (deleted > 0) {
      await createAuditLog({
        actorId: 'system',
        action: 'CARDDAV_AUTO_CLEANUP',
        target: 'System',
        meta: { deleted, failed, candidates: candidates.length },
      })
    }

    console.log(`CardDAV cleanup: ${deleted} deleted, ${failed} failed out of ${candidates.length} candidates`)

    return NextResponse.json({ ok: true, deleted, failed, total: candidates.length })
  } catch (error) {
    console.error('CardDAV cleanup cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
