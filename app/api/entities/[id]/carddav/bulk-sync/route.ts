import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { buildVCard, pushContact, searchByName, decryptConfig, type CardDavConfig } from '@/lib/carddav'
import { downloadDocument, isDocsGraphConfigured } from '@/lib/graph-teams'
import { createAuditLog } from '@/lib/audit'
import { randomUUID } from 'crypto'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin()
    const { id } = await params

    const authUser = toAuthorizedUser(user)
    if (!can(authUser, 'carddav:configure')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const entity = await prisma.entity.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cardDavEnabled: true,
        cardDavUrl: true,
        cardDavUsername: true,
        cardDavPasswordEnc: true,
        cardDavAddressBook: true,
      },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    if (!entity.cardDavEnabled) {
      return NextResponse.json({ error: 'CardDAV niet ingeschakeld' }, { status: 400 })
    }

    let config: CardDavConfig
    try {
      config = decryptConfig(entity)
    } catch {
      return NextResponse.json({ error: 'CardDAV configuratie ongeldig' }, { status: 500 })
    }

    const starters = await prisma.starter.findMany({
      where: {
        entityId: id,
        isCancelled: false,
        cardDavStatus: { notIn: ['SOFT_DELETED', 'DELETED'] },
        OR: [
          { phoneNumber: { not: null } },
          { desiredEmail: { not: null } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        desiredEmail: true,
        cardDavUid: true,
        photoDriveId: true,
        photoItemId: true,
        photoMimeType: true,
        photoUpload: {
          select: { teamsDriveId: true, teamsItemId: true, mimeType: true },
        },
      },
      take: 500,
    })

    const total = starters.length
    const encoder = new TextEncoder()
    let synced = 0
    let failed = 0
    const errors: Array<{ starterId: string; name: string; error: string }> = []

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        send({ type: 'start', total })

        for (const starter of starters) {
          try {
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
              } catch {
                // Photo fetch failed — sync without photo
              }
            }

            let uid = starter.cardDavUid
            if (!uid) {
              const search = await searchByName(config, `${starter.firstName} ${starter.lastName}`)
              uid = search.success && search.data ? search.data : randomUUID()
            }

            const vcard = buildVCard(
              {
                firstName: starter.firstName,
                lastName: starter.lastName,
                phone: starter.phoneNumber,
                email: starter.desiredEmail,
                entityName: entity.name,
                photoBase64,
                photoMimeType,
              },
              uid,
            )

            const result = await pushContact(config, uid, vcard)
            if (result.success) {
              await prisma.starter.update({
                where: { id: starter.id },
                data: { cardDavUid: uid, cardDavSyncedAt: new Date(), cardDavStatus: 'SYNCED' },
              })
              synced++
            } else {
              await prisma.starter.update({
                where: { id: starter.id },
                data: { cardDavStatus: 'ERROR' },
              })
              failed++
              errors.push({
                starterId: starter.id,
                name: `${starter.firstName} ${starter.lastName}`,
                error: result.error || 'Unknown error',
              })
            }
          } catch (err) {
            await prisma.starter.update({
              where: { id: starter.id },
              data: { cardDavStatus: 'ERROR' },
            }).catch(() => {})
            failed++
            errors.push({
              starterId: starter.id,
              name: `${starter.firstName} ${starter.lastName}`,
              error: (err as Error).message,
            })
          }

          send({ type: 'progress', synced, failed, total })
        }

        send({ type: 'done', synced, failed, total, errors })

        await createAuditLog({
          actorId: user.id,
          action: 'CARDDAV_BULK_SYNC',
          target: `Entity:${id}`,
          meta: { entityId: id, synced, failed, total },
        })

        controller.close()
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Bulk sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
