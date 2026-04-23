import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import {
  getItemByPath,
  graphErrorToStatus,
  isDocsGraphConfigured,
  isSafeImageMimeType,
  listStarterImages,
  type GraphLikeError,
} from '@/lib/graph-teams'
import { createAuditLog } from '@/lib/audit'

// POST /api/starters/[id]/photo/refresh
//
// Twee modi:
// 1. Zonder body → koppelt de meest recente `headshot-raw` upload van deze
//    starter als profielfoto (originele "auto"-gedrag).
// 2. Met body `{ driveId, itemId }` → koppelt een specifiek bestand uit
//    SharePoint als profielfoto (handmatig gekozen uit de starter-map). Het
//    bestand MOET in de SharePoint-map van deze starter staan.
//
// Vereist `starters:photo:manage` permissie, entity-scoped.

const BodySchema = z.object({
  driveId: z.string().min(1),
  itemId: z.string().min(1),
})

// Leest de request body als JSON en retourneert:
//   - `null` als er geen body is (Content-Length 0 OF lege string)
//   - het geparsde object als het body een plain object is
//   - gooit een Error met `code = 'INVALID_BODY'` als parsing faalt of als de
//     body geen plain object is (arrays, primitives, null)
//
// We vertrouwen `Content-Length` NIET — chunked transfers of HTTP/2 requests
// zetten die header niet. We lezen altijd eerst de raw text en beslissen op
// basis daarvan of er data is.
async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  const text = await request.text()
  if (!text || text.trim() === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const err: any = new Error('Invalid JSON body')
    err.code = 'INVALID_BODY'
    throw err
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    const err: any = new Error('Body must be a JSON object')
    err.code = 'INVALID_BODY'
    throw err
  }
  return parsed as Record<string, unknown>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityId: true,
        entity: { select: { name: true } },
        photoUploadId: true,
        photoDriveId: true,
        photoItemId: true,
      },
    })
    if (!starter) {
      return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
    }

    const authUser = toAuthorizedUser(user)
    if (!can(authUser, 'starters:photo:manage', { entityId: starter.entityId ?? undefined })) {
      return NextResponse.json(
        { error: 'Forbidden: permissie starters:photo:manage vereist voor deze entiteit' },
        { status: 403 },
      )
    }

    // --- Body parsing ---
    // Drie gevallen:
    //   a) Geen body / lege body → auto-mode
    //   b) Valide `{driveId, itemId}` → pick-mode
    //   c) Body aanwezig maar incompleet/onjuist → 400 (GEEN stille fallback)
    let pickBody: { driveId: string; itemId: string } | null = null

    let rawBody: Record<string, unknown> | null
    try {
      rawBody = await readJsonBody(request)
    } catch (e: any) {
      if (e?.code === 'INVALID_BODY') {
        return NextResponse.json(
          { error: 'Ongeldige request body: verwacht JSON object of leeg' },
          { status: 400 },
        )
      }
      throw e
    }

    // Lege object `{}` is ook expliciet ongeldig voor pick-mode. De client moet
    // óf helemaal geen body sturen (= auto-mode), óf een volledige `{driveId, itemId}`.
    if (rawBody !== null && Object.keys(rawBody).length > 0) {
      const parsed = BodySchema.safeParse(rawBody)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Body vereist zowel driveId als itemId' },
          { status: 400 },
        )
      }
      pickBody = parsed.data
    } else if (rawBody !== null) {
      // Leeg object `{}` → behandel als expliciete fout, niet als stille auto-fallback.
      return NextResponse.json(
        { error: 'Body is leeg. Laat weg voor auto-mode, of stuur { driveId, itemId }' },
        { status: 400 },
      )
    }

    // --- Modus 2: specifiek bestand gekozen uit SharePoint-map ---
    if (pickBody) {
      if (!isDocsGraphConfigured()) {
        return NextResponse.json(
          { error: 'Graph is niet geconfigureerd' },
          { status: 503 },
        )
      }

      if (!starter.entity?.name) {
        return NextResponse.json(
          { error: 'Starter heeft geen entity gekoppeld' },
          { status: 400 },
        )
      }

      // Ownership check: het gekozen bestand moet écht in de SharePoint-map
      // van deze starter staan. Zonder deze check kan iemand met photo:manage
      // rechten op starter A een willekeurig bestand in de tenant drive als
      // foto linken (cross-starter file-pick).
      let candidates
      try {
        candidates = await listStarterImages(
          starter.entity.name,
          starter.lastName,
          starter.firstName,
        )
      } catch (err) {
        const e = err as GraphLikeError
        console.error('Error listing starter images for ownership check:', e?.message)
        return NextResponse.json(
          { error: 'SharePoint niet bereikbaar' },
          { status: graphErrorToStatus(e) },
        )
      }

      const match = candidates.find(
        (img) => img.driveId === pickBody.driveId && img.itemId === pickBody.itemId,
      )
      if (!match) {
        return NextResponse.json(
          {
            error:
              'Geselecteerd bestand hoort niet bij deze starter of is geen geldige afbeelding',
          },
          { status: 403 },
        )
      }

      // `listStarterImages` filtert al op veilige image mime types, maar we
      // verifiëren nogmaals — defense-in-depth.
      if (!isSafeImageMimeType(match.mimeType)) {
        return NextResponse.json(
          { error: 'Geselecteerd bestand is geen ondersteund afbeeldingsformaat' },
          { status: 400 },
        )
      }

      await prisma.starter.update({
        where: { id },
        data: {
          photoUploadId: null,
          photoDriveId: match.driveId,
          photoItemId: match.itemId,
          photoFileName: match.fileName,
          photoMimeType: match.mimeType,
        },
      })

      await createAuditLog({
        actorId: user.id,
        action: 'STARTER_PHOTO_PICK',
        target: `Starter:${id}`,
        meta: {
          starterId: id,
          entityId: starter.entityId,
          driveId: match.driveId,
          itemId: match.itemId,
          fileName: match.fileName,
          folder: match.folder,
          previous: {
            photoUploadId: starter.photoUploadId,
            photoDriveId: starter.photoDriveId,
            photoItemId: starter.photoItemId,
          },
        },
      })

      return NextResponse.json({
        ok: true,
        mode: 'pick',
        fileName: match.fileName,
      })
    }

    // --- Modus 1: auto-link meest recente headshot-raw upload ---
    const upload = await prisma.starterTaskUpload.findFirst({
      where: {
        variant: 'headshot-raw',
        task: { starterId: id },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    if (!upload) {
      return NextResponse.json(
        { error: 'Geen headshot-raw upload gevonden voor deze starter' },
        { status: 404 },
      )
    }

    let teamsDriveId = upload.teamsDriveId
    let teamsItemId = upload.teamsItemId
    if ((!teamsDriveId || !teamsItemId) && isDocsGraphConfigured()) {
      if (upload.sharePointPath.startsWith('local://')) {
        return NextResponse.json(
          {
            error:
              'Upload is niet in SharePoint opgeslagen (local fallback). Upload opnieuw.',
          },
          { status: 400 },
        )
      }
      let item
      try {
        item = await getItemByPath(upload.sharePointPath)
      } catch (err) {
        const e = err as GraphLikeError
        console.error('Error resolving upload path in Graph:', e?.message)
        return NextResponse.json(
          { error: 'SharePoint niet bereikbaar' },
          { status: graphErrorToStatus(e) },
        )
      }
      if (!item) {
        return NextResponse.json(
          { error: 'Bestand niet gevonden in SharePoint' },
          { status: 404 },
        )
      }
      teamsDriveId = item.driveId
      teamsItemId = item.itemId
      await prisma.starterTaskUpload.update({
        where: { id: upload.id },
        data: { teamsDriveId, teamsItemId },
      })
    }

    if (!teamsDriveId || !teamsItemId) {
      return NextResponse.json(
        { error: 'Graph is niet geconfigureerd; kan upload niet resolven' },
        { status: 503 },
      )
    }

    await prisma.starter.update({
      where: { id },
      data: {
        photoUploadId: upload.id,
        photoDriveId: null,
        photoItemId: null,
        photoFileName: null,
        photoMimeType: null,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'STARTER_PHOTO_REFRESH',
      target: `Starter:${id}`,
      meta: {
        starterId: id,
        entityId: starter.entityId,
        uploadId: upload.id,
        sharePointPath: upload.sharePointPath,
        previous: {
          photoUploadId: starter.photoUploadId,
          photoDriveId: starter.photoDriveId,
          photoItemId: starter.photoItemId,
        },
      },
    })

    return NextResponse.json({
      ok: true,
      mode: 'auto',
      uploadId: upload.id,
      uploadedAt: upload.uploadedAt,
      fileName: upload.fileName,
    })
  } catch (error: any) {
    if (error?.message?.includes('Forbidden') || error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Error refreshing starter photo:', error?.message)
    // Geen `details` in de response: error-berichten van Graph/Prisma bevatten
    // soms tenant/drive-ids of interne paden die niet naar de client moeten lekken.
    return NextResponse.json({ error: 'Failed to refresh photo' }, { status: 500 })
  }
}
