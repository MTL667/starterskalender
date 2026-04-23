import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canViewEntity } from '@/lib/rbac'
import { downloadDocument, isDocsGraphConfigured, isSafeImageMimeType } from '@/lib/graph-teams'

// Sanitize de bestandsnaam voor de Content-Disposition header:
//   - filter ALLE C0 controls (\x00-\x1F) + DEL (\x7F) → header injection
//   - filter `"` en `\` → breken de quoted-string syntax
//   - filter U+2028/U+2029 → LINE SEPARATOR / PARAGRAPH SEPARATOR (JS breakers)
//   - zorg dat we op een code-point grens splitsen (geen halve surrogate pair)
function sanitizeFileName(name: string): string {
  const stripped = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F"\\\u2028\u2029]/g, '_')
  // `Array.from` itereert op code points, dus surrogate pairs blijven intact.
  const codePoints = Array.from(stripped)
  if (codePoints.length <= 200) return stripped
  return codePoints.slice(0, 200).join('')
}

// RFC 5987 encoding voor de `filename*` parameter. `encodeURIComponent` laat
// `'`, `(`, `)`, `*`, `!` ongeencoded door; die zijn niet toegestaan in
// `attr-char` per RFC 8187. We escapen ze alsnog naar hun percent-vorm.
function rfc5987Encode(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*!]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  )
}

// GET /api/starters/[id]/photo
// Proxy voor de profielfoto van een starter. De binary leeft in SharePoint;
// wij halen hem on-demand op via Graph en serveren hem als image/*.
//
// Bronnen (in volgorde van prioriteit):
//   1. Directe velden op Starter (photoDriveId/photoItemId) — gezet via de
//      "foto kiezen" flow wanneer een specifiek bestand uit de map wordt gekozen.
//   2. `photoUpload` relatie naar StarterTaskUpload — gezet via auto-link bij
//      headshot-raw upload of via de legacy refresh-knop.
//
// Caching: private, 5 minuten.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: {
        entityId: true,
        photoDriveId: true,
        photoItemId: true,
        photoFileName: true,
        photoMimeType: true,
        photoUpload: {
          select: {
            teamsDriveId: true,
            teamsItemId: true,
            mimeType: true,
            fileName: true,
          },
        },
      },
    })

    if (!starter) {
      return new NextResponse('Starter not found', { status: 404 })
    }

    if (starter.entityId && !canViewEntity(user, starter.entityId)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    let driveId: string | null = null
    let itemId: string | null = null
    let mimeType = 'image/jpeg'
    let fileName = 'photo.jpg'

    if (starter.photoDriveId && starter.photoItemId) {
      driveId = starter.photoDriveId
      itemId = starter.photoItemId
      mimeType = starter.photoMimeType || mimeType
      fileName = starter.photoFileName || fileName
    } else if (starter.photoUpload?.teamsDriveId && starter.photoUpload?.teamsItemId) {
      driveId = starter.photoUpload.teamsDriveId
      itemId = starter.photoUpload.teamsItemId
      mimeType = starter.photoUpload.mimeType || mimeType
      fileName = starter.photoUpload.fileName || fileName
    }

    if (!driveId || !itemId || !isDocsGraphConfigured()) {
      return new NextResponse('No photo', { status: 404 })
    }

    // Veiligheidsnet: alleen veilige image mimes serveren, ook als de DB
    // per ongeluk iets anders bevat (bv. oudere data of manueel geëditeerd).
    let safeMime: string
    if (isSafeImageMimeType(mimeType)) {
      safeMime = mimeType
    } else {
      // Log operationeel signaal voor ops: een row met onveilig mime type is
      // waarschijnlijk historisch verkeerde data of ongewenste import.
      console.warn(
        `Starter ${id} heeft onveilig/ongeldig photo mime "${mimeType}"; serveer als image/jpeg fallback.`,
      )
      safeMime = 'image/jpeg'
    }
    const safeFileName = sanitizeFileName(fileName)
    const encodedName = rfc5987Encode(safeFileName)

    const buffer = await downloadDocument(driveId, itemId)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': safeMime,
        'Content-Disposition': `inline; filename="${safeFileName}"; filename*=UTF-8''${encodedName}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error serving starter photo:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
