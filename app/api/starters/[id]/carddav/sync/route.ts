import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { buildVCard, pushContact, searchByName, decryptConfig } from '@/lib/carddav'
import { downloadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'
import { createAuditLog } from '@/lib/audit'
import { eventBus } from '@/lib/events'
import { randomUUID } from 'crypto'

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
        phoneNumber: true,
        desiredEmail: true,
        entityId: true,
        cardDavUid: true,
        cardDavStatus: true,
        photoDriveId: true,
        photoItemId: true,
        photoMimeType: true,
        photoUpload: {
          select: { teamsDriveId: true, teamsItemId: true, mimeType: true },
        },
        entity: {
          select: {
            name: true,
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

    if (!can(authUser, 'carddav:sync', { entityId: starter.entityId ?? undefined })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!starter.entity?.cardDavEnabled) {
      return NextResponse.json({ error: 'CardDAV niet ingeschakeld voor deze entiteit' }, { status: 400 })
    }

    if (starter.cardDavStatus === 'DELETED') {
      return NextResponse.json({ error: 'Contact is definitief verwijderd en kan niet opnieuw gesynchroniseerd worden' }, { status: 400 })
    }

    if (starter.cardDavStatus === 'SOFT_DELETED') {
      return NextResponse.json({ error: 'Contact is soft-deleted; verwijder eerst definitief of wacht op automatische cleanup' }, { status: 400 })
    }

    if (!starter.phoneNumber && !starter.desiredEmail) {
      return NextResponse.json({ error: 'Telefoon of email is vereist voor CardDAV sync' }, { status: 400 })
    }

    let config
    try {
      config = decryptConfig(starter.entity)
    } catch {
      return NextResponse.json({ error: 'CardDAV configuratie onvolledig of ongeldig' }, { status: 500 })
    }

    let photoBase64: string | null = null
    let photoMimeType: string | null = null

    const driveId = starter.photoDriveId || starter.photoUpload?.teamsDriveId
    const itemId = starter.photoItemId || starter.photoUpload?.teamsItemId
    const mime = starter.photoMimeType || starter.photoUpload?.mimeType

    if (driveId && itemId && isDocsGraphConfigured()) {
      try {
        const buffer = await downloadDocument(driveId, itemId)
        photoBase64 = Buffer.from(buffer).toString('base64')
        photoMimeType = mime || 'image/jpeg'
      } catch (err) {
        console.warn('Could not fetch photo for CardDAV sync:', (err as Error).message)
      }
    }

    let uid = starter.cardDavUid
    if (!uid) {
      const searchResult = await searchByName(config, `${starter.firstName} ${starter.lastName}`)
      if (searchResult.success && searchResult.data) {
        uid = searchResult.data
      } else {
        uid = randomUUID()
      }
    }

    const vcard = buildVCard(
      {
        firstName: starter.firstName,
        lastName: starter.lastName,
        phone: starter.phoneNumber,
        email: starter.desiredEmail,
        entityName: starter.entity.name,
        photoBase64,
        photoMimeType,
      },
      uid,
    )

    const result = await pushContact(config, uid, vcard)
    if (!result.success) {
      await prisma.starter.update({
        where: { id },
        data: { cardDavStatus: 'ERROR' },
      })
      return NextResponse.json({ error: result.error || 'CardDAV sync failed' }, { status: 502 })
    }

    await prisma.starter.update({
      where: { id },
      data: {
        cardDavUid: uid,
        cardDavSyncedAt: new Date(),
        cardDavStatus: 'SYNCED',
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CARDDAV_SYNC',
      target: `Starter:${id}`,
      meta: { starterId: id, entityId: starter.entityId, uid },
    })

    eventBus.emit({
      type: 'starter:updated',
      entityId: starter.entityId || '',
      payload: { starterId: id, cardDavStatus: 'SYNCED' },
    })

    return NextResponse.json({ ok: true, uid, syncedAt: new Date().toISOString() })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('CardDAV sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
