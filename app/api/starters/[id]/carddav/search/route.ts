import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { decryptConfig, searchByName } from '@/lib/carddav'
import { eventBus } from '@/lib/events'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const authUser = toAuthorizedUser(user)

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityId: true,
        cardDavUid: true,
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

    if (!starter.entity?.cardDavEnabled) {
      return NextResponse.json({ error: 'CardDAV niet ingeschakeld voor deze entiteit' }, { status: 400 })
    }

    let config
    try {
      config = decryptConfig(starter.entity)
    } catch {
      return NextResponse.json({ error: 'CardDAV configuratie ongeldig' }, { status: 500 })
    }

    const fullName = `${starter.firstName} ${starter.lastName}`
    const result = await searchByName(config, fullName)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Zoeken mislukt' }, { status: 502 })
    }

    if (!result.data) {
      return NextResponse.json({ ok: true, found: false })
    }

    const cleanUid = result.data.replace(/&#\d+;/g, '').trim()

    await prisma.starter.update({
      where: { id },
      data: { cardDavUid: cleanUid, cardDavStatus: 'SYNCED' },
    })

    eventBus.emit({
      type: 'starter:updated',
      entityId: starter.entityId || '',
      payload: { starterId: id, cardDavStatus: 'SYNCED' },
    })

    return NextResponse.json({ ok: true, found: true, uid: result.data })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('CardDAV search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
