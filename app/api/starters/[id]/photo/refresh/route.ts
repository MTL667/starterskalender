import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { getItemByPath, getItemById, isDocsGraphConfigured } from '@/lib/graph-teams'
import { createAuditLog } from '@/lib/audit'

// POST /api/starters/[id]/photo/refresh
//
// Twee modi:
// 1. Zonder body → koppelt de meest recente `headshot-raw` upload van deze starter
//    als profielfoto (originele "auto"-gedrag).
// 2. Met body `{ driveId, itemId }` → koppelt een specifiek bestand uit SharePoint
//    als profielfoto (handmatig gekozen uit de starter-map). Dit werkt ook voor
//    bestanden die niet via een task upload zijn aangemaakt.
//
// Vereist `starters:photo:manage` permissie, entity-scoped.

const BodySchema = z
  .object({
    driveId: z.string().min(1).optional(),
    itemId: z.string().min(1).optional(),
  })
  .optional()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, entityId: true },
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

    // Parse optionele body (fout bij invalid JSON/body → body blijft undefined).
    let body: z.infer<typeof BodySchema> = undefined
    try {
      const raw = await request.json()
      body = BodySchema.parse(raw)
    } catch {
      body = undefined
    }

    // --- Modus 2: specifiek bestand gekozen uit SharePoint-map ---
    if (body?.driveId && body?.itemId) {
      if (!isDocsGraphConfigured()) {
        return NextResponse.json(
          { error: 'Graph is niet geconfigureerd' },
          { status: 503 },
        )
      }

      const item = await getItemById(body.driveId, body.itemId)
      if (!item) {
        return NextResponse.json(
          { error: 'Bestand niet gevonden in SharePoint' },
          { status: 404 },
        )
      }

      if (!item.mimeType.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Geselecteerd bestand is geen afbeelding' },
          { status: 400 },
        )
      }

      await prisma.starter.update({
        where: { id },
        data: {
          photoUploadId: null,
          photoDriveId: body.driveId,
          photoItemId: body.itemId,
          photoFileName: item.name,
          photoMimeType: item.mimeType,
        },
      })

      await createAuditLog({
        actorId: user.id,
        action: 'STARTER_PHOTO_PICK',
        target: `Starter:${id}`,
        meta: {
          starterId: id,
          driveId: body.driveId,
          itemId: body.itemId,
          fileName: item.name,
        },
      })

      return NextResponse.json({
        ok: true,
        mode: 'pick',
        fileName: item.name,
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
      const item = await getItemByPath(upload.sharePointPath)
      if (!item) {
        return NextResponse.json(
          {
            error:
              'Bestand niet gevonden in SharePoint op pad ' + upload.sharePointPath,
          },
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
      meta: { starterId: id, uploadId: upload.id, sharePointPath: upload.sharePointPath },
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
    console.error('Error refreshing starter photo:', error)
    return NextResponse.json(
      { error: 'Failed to refresh photo', details: error?.message },
      { status: 500 },
    )
  }
}
