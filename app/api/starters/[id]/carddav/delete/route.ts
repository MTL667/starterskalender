import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { decryptConfig, deleteContact, updateContactNote } from '@/lib/carddav'
import { createAuditLog } from '@/lib/audit'
import { eventBus } from '@/lib/events'

const BodySchema = z.object({
  mode: z.enum(['soft', 'hard']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'mode moet "soft" of "hard" zijn' }, { status: 400 })
    }
    const { mode } = parsed.data

    const authUser = toAuthorizedUser(user)

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityId: true,
        startDate: true,
        cardDavUid: true,
        cardDavStatus: true,
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
    })

    if (!starter) {
      return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
    }

    if (!can(authUser, 'carddav:delete', { entityId: starter.entityId ?? undefined })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!starter.cardDavUid) {
      return NextResponse.json({ error: 'Geen CardDAV contact gevonden voor deze starter' }, { status: 400 })
    }

    if (!starter.entity?.cardDavEnabled) {
      return NextResponse.json({ error: 'CardDAV niet ingeschakeld voor deze entiteit' }, { status: 400 })
    }

    let config
    try {
      config = decryptConfig(starter.entity)
    } catch {
      return NextResponse.json({ error: 'CardDAV configuratie ongeldig' }, { status: 500 })
    }

    if (mode === 'soft') {
      const dateStr = starter.startDate
        ? starter.startDate.toLocaleDateString('nl-BE')
        : 'onbekend'
      const note = `Vertrokken per ${dateStr}`
      const result = await updateContactNote(config, starter.cardDavUid, note)
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Soft-delete failed' }, { status: 502 })
      }
      await prisma.starter.update({
        where: { id },
        data: { cardDavStatus: 'SOFT_DELETED', cardDavSyncedAt: new Date() },
      })
    } else {
      const result = await deleteContact(config, starter.cardDavUid)
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Hard-delete failed' }, { status: 502 })
      }
      await prisma.starter.update({
        where: { id },
        data: { cardDavStatus: 'DELETED', cardDavUid: null, cardDavSyncedAt: null },
      })
    }

    await createAuditLog({
      actorId: user.id,
      action: mode === 'soft' ? 'CARDDAV_SOFT_DELETE' : 'CARDDAV_HARD_DELETE',
      target: `Starter:${id}`,
      meta: { starterId: id, entityId: starter.entityId, uid: starter.cardDavUid, mode },
    })

    eventBus.emit({
      type: 'starter:updated',
      entityId: starter.entityId || '',
      payload: { starterId: id, cardDavStatus: mode === 'soft' ? 'SOFT_DELETED' : 'DELETED' },
    })

    return NextResponse.json({ ok: true, mode })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('CardDAV delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
