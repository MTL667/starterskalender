import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { graphDocs, isDocsGraphConfigured, isSafeImageMimeType } from '@/lib/graph-teams'
import { Client } from '@microsoft/microsoft-graph-client'

async function resolveDriveId(client: Client): Promise<string> {
  const driveId = process.env.TEAMS_DRIVE_ID
  if (driveId) return driveId
  const drive = await client.api(`/sites/${process.env.TEAMS_SITE_ID}/drive`).get()
  return drive.id
}

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('recruitment:read')

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')
    const folder = searchParams.get('folder') || ''
    const search = searchParams.get('search') || ''

    if (!entityId) {
      return NextResponse.json({ error: { message: 'entityId is required', code: 'VALIDATION_ERROR' } }, { status: 400 })
    }

    if (!can(user, 'recruitment:read', { entityId })) {
      return NextResponse.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, { status: 403 })
    }

    if (!isDocsGraphConfigured()) {
      return NextResponse.json({ error: { message: 'SharePoint integration not configured', code: 'NOT_CONFIGURED' } }, { status: 503 })
    }

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { name: true },
    })

    if (!entity) {
      return NextResponse.json({ error: { message: 'Entity not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const client = await graphDocs()
    const driveId = await resolveDriveId(client)
    const basePath = `${entity.name}/Photos`
    const browseFolder = folder ? `${basePath}/${folder}` : basePath
    const encodedPath = browseFolder.split('/').map(encodeURIComponent).join('/')

    let items: any[]
    if (search) {
      const sanitizedSearch = search.replace(/'/g, "''")
      const searchResult = await client
        .api(`/drives/${driveId}/root:/${encodedPath}:/search(q='${encodeURIComponent(sanitizedSearch)}')`)
        .select('id,name,file,size,lastModifiedDateTime,webUrl,image,parentReference')
        .top(50)
        .get()
      items = searchResult?.value ?? []
    } else {
      const result = await client
        .api(`/drives/${driveId}/root:/${encodedPath}:/children`)
        .select('id,name,file,folder,size,lastModifiedDateTime,webUrl,image,parentReference')
        .top(100)
        .get()
      items = result?.value ?? []
    }

    const folders: Array<{ name: string }> = []
    const photos: Array<{
      driveId: string
      itemId: string
      fileName: string
      mimeType: string
      width?: number
      height?: number
      sizeBytes: number
    }> = []

    for (const item of items) {
      if (item.folder) {
        folders.push({ name: item.name })
        continue
      }
      const mimeType = item.file?.mimeType || ''
      if (!isSafeImageMimeType(mimeType)) continue

      photos.push({
        driveId,
        itemId: item.id,
        fileName: item.name,
        mimeType: mimeType.split(';')[0].trim(),
        width: item.image?.width,
        height: item.image?.height,
        sizeBytes: item.size || 0,
      })
    }

    return NextResponse.json({ data: { folders, photos, currentFolder: folder || '' } })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    if (error?.statusCode === 404) {
      return NextResponse.json({ data: { folders: [], photos: [], currentFolder: '' } })
    }
    console.error('Error listing SharePoint photos:', error)
    return NextResponse.json({ error: { message: 'Photo library temporarily unavailable', code: 'GRAPH_UNAVAILABLE' } }, { status: 503 })
  }
}
