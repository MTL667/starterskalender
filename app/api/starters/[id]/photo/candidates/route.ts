import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { listStarterImages, isDocsGraphConfigured } from '@/lib/graph-teams'

// GET /api/starters/[id]/photo/candidates
// Lijst van alle afbeeldingen in de SharePoint-map van deze starter (root + submappen).
// Gebruikt in de UI om een specifieke foto als profielfoto te kiezen.
// Vereist `starters:photo:manage` permissie, entity-scoped.
export async function GET(
  _request: NextRequest,
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

    let images
    try {
      images = await listStarterImages(
        starter.entity.name,
        starter.lastName,
        starter.firstName,
      )
    } catch (err: any) {
      const s = err?.statusCode
      const upstream = typeof s === 'number' && s >= 400 && s < 600
      console.error('Error listing photo candidates:', err?.message)
      return NextResponse.json(
        { error: upstream ? 'SharePoint niet bereikbaar' : 'Failed to list candidates' },
        { status: upstream ? 502 : 500 },
      )
    }

    return NextResponse.json({ images })
  } catch (error: any) {
    if (error?.message?.includes('Forbidden') || error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Error listing photo candidates:', error?.message)
    // Geen `details` in response — voorkomt lekken van interne paden/ids.
    return NextResponse.json({ error: 'Failed to list candidates' }, { status: 500 })
  }
}
