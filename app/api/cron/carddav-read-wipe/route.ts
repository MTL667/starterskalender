import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/cron-auth'
import {
  decryptReadConfig,
  shouldSkipReadWipe,
  isReadConfigSameAsMaster,
  wipeAddressBook,
} from '@/lib/carddav'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  try {
    const entities = await prisma.entity.findMany({
      where: { cardDavReadEnabled: true },
      select: {
        id: true,
        name: true,
        cardDavUrl: true,
        cardDavUsername: true,
        cardDavAddressBook: true,
        cardDavReadUrl: true,
        cardDavReadUsername: true,
        cardDavReadPasswordEnc: true,
      },
    })

    let wiped = 0
    let failed = 0
    let skipped = 0

    for (const entity of entities) {
      if (
        !entity.cardDavReadUrl ||
        !entity.cardDavReadUsername ||
        !entity.cardDavReadPasswordEnc
      ) {
        skipped++
        continue
      }

      if (shouldSkipReadWipe(entity.cardDavAddressBook)) {
        console.warn(
          `CardDAV read wipe skipped for ${entity.id} (${entity.name}): MASTER book is "contacts"`,
        )
        skipped++
        continue
      }

      if (
        isReadConfigSameAsMaster(
          { url: entity.cardDavReadUrl, username: entity.cardDavReadUsername },
          { url: entity.cardDavUrl, username: entity.cardDavUsername },
        )
      ) {
        console.warn(
          `CardDAV read wipe skipped for ${entity.id} (${entity.name}): read credentials match MASTER`,
        )
        skipped++
        continue
      }

      try {
        const config = decryptReadConfig(entity)
        const result = await wipeAddressBook(config)
        if (!result.success || !result.data) {
          console.warn(`CardDAV read wipe failed for ${entity.id}: ${result.error}`)
          failed++
          continue
        }
        wiped += result.data.wiped
        failed += result.data.failed
      } catch (err) {
        console.warn(
          `CardDAV read wipe error for ${entity.id}:`,
          (err as Error).message,
        )
        failed++
      }
    }

    if (entities.length > 0) {
      await createAuditLog({
        action: 'CARDDAV_READ_WIPE',
        target: 'System',
        meta: {
          wiped,
          failed,
          skipped,
          entities: entities.length,
        },
      })
    }

    console.log(
      `CardDAV read wipe: ${wiped} wiped, ${failed} failed, ${skipped} skipped (${entities.length} entities)`,
    )

    return NextResponse.json({
      ok: true,
      wiped,
      failed,
      skipped,
      entities: entities.length,
    })
  } catch (error) {
    console.error('CardDAV read wipe cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
