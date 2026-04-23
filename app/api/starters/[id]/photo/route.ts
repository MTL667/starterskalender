import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canViewEntity } from '@/lib/rbac'
import { downloadDocument, isDocsGraphConfigured, isSafeImageMimeType } from '@/lib/graph-teams'

// Sanitize de bestandsnaam (unicode variant, voor `filename*=UTF-8''...`):
//   - filter ALLE C0 controls (\x00-\x1F) + DEL (\x7F) → header injection
//   - filter `"` en `\` → breken de quoted-string syntax
//   - filter U+2028/U+2029 → LINE SEPARATOR / PARAGRAPH SEPARATOR (JS breakers)
//   - splits op code-point grens (geen halve surrogate pair)
function sanitizeFileName(name: string): string {
  const stripped = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F"\\\u2028\u2029]/g, '_')
  // `Array.from` itereert op code points, dus surrogate pairs blijven intact.
  const codePoints = Array.from(stripped)
  if (codePoints.length <= 200) return stripped
  return codePoints.slice(0, 200).join('')
}

// Strikte ASCII-versie voor de legacy `filename="..."` parameter. RFC 7230
// staat alleen VCHAR (0x21-0x7E, excl. `"` en `\`) toe in header values.
// Niet-ASCII unicode gaat naar `_` zodat de header byte-safe blijft; de
// volledige unicode naam leeft in `filename*=UTF-8''...`.
function toAsciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, '_')
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

// Sanitize user/DB-supplied strings voordat we ze loggen: CR/LF en andere
// controls vervangen door hun escape-sequence, en max 120 chars zodat
// log-lijnen niet geforged of opgeblazen kunnen worden.
function safeLogValue(value: unknown): string {
  const s = typeof value === 'string' ? value : String(value)
  const truncated = s.length > 120 ? s.slice(0, 120) + '…' : s
  // eslint-disable-next-line no-control-regex
  return truncated.replace(/[\x00-\x1F\x7F]/g, (c) => {
    if (c === '\n') return '\\n'
    if (c === '\r') return '\\r'
    if (c === '\t') return '\\t'
    return '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')
  })
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
      // Sanitize de user/DB-supplied mime voordat we hem loggen — voorkomt
      // log-forging door CR/LF injection in kwaadaardig ingevoerde waarden.
      console.warn(
        `Starter ${id} heeft onveilig/ongeldig photo mime "${safeLogValue(mimeType)}"; serveer als image/jpeg fallback.`,
      )
      safeMime = 'image/jpeg'
    }

    // Content-Type vereist een *bare* media-type zonder parameters (Graph
    // retourneert soms `image/jpeg; charset=binary`). De parameters strippen
    // we — de bytes zijn binary, charset is irrelevant en kan sommige browsers
    // in de war sturen.
    const bareMime = safeMime.split(';')[0].trim()

    const safeFileName = sanitizeFileName(fileName)
    const asciiFileName = toAsciiFileName(safeFileName)
    const encodedName = rfc5987Encode(safeFileName)

    const buffer = await downloadDocument(driveId, itemId)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': bareMime,
        // Legacy `filename=` moet ASCII-only zijn voor RFC 7230 conformance;
        // `filename*` levert de volledige unicode naam voor moderne clients.
        'Content-Disposition': `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodedName}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error serving starter photo:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
