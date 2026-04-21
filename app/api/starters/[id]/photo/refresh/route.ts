import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { getItemByPath, isDocsGraphConfigured } from '@/lib/graph-teams'
import { createAuditLog } from '@/lib/audit'

// POST /api/starters/[id]/photo/refresh
// Koppelt de meest recente `headshot-raw` upload van deze starter als de
// profielfoto en backfillt ontbrekende Graph `driveId`/`itemId` op de upload.
//
// Bedoeld voor starters waarvan de headshot al vóór de profielfoto-feature is
// geüpload en dus nog niet automatisch gelinkt is. Vereist `starters:photo:manage`
// permissie, entity-scoped.
export async function POST(
  _request: NextRequest,
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

    // Zoek de meest recente headshot-raw upload die aan een task van deze
    // starter hangt. We filteren op variant EN op task.starterId.
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

    // Backfill driveId/itemId als die ontbreken. De kolommen bestaan pas sinds
    // de profielfoto-feature; oudere uploads hebben alleen een pad.
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
      data: { photoUploadId: upload.id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'STARTER_PHOTO_REFRESH',
      target: `Starter:${id}`,
      meta: { starterId: id, uploadId: upload.id, sharePointPath: upload.sharePointPath },
    })

    return NextResponse.json({
      ok: true,
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
