import { graphDocs } from '@/lib/graph-teams'

const DRIVE_ID_ENV = process.env.SHAREPOINT_DRIVE_ID

function safeName(s: string): string {
  return s.replace(/[<>:"/\\|?*]/g, '_').trim()
}

function encodePathSegments(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

async function resolveDriveId(client: any): Promise<string> {
  if (DRIVE_ID_ENV) return DRIVE_ID_ENV
  const siteId = process.env.SHAREPOINT_SITE_ID
  if (!siteId) throw new Error('SHAREPOINT_SITE_ID or SHAREPOINT_DRIVE_ID must be set')
  const drive = await client.api(`/sites/${siteId}/drive`).get()
  return drive.id
}

function safeFileName(name: string): string {
  const base = name.split('/').pop()?.split('\\').pop() ?? name
  const sanitized = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim()
  if (sanitized.length === 0) return 'cv_upload'
  return sanitized.slice(0, 200)
}

export async function uploadCandidateCV(
  entityName: string,
  vacancyTitle: string,
  candidateEmail: string,
  fileName: string,
  content: Buffer
): Promise<{ driveId: string; itemId: string; webUrl: string }> {
  const client = await graphDocs()
  const driveId = await resolveDriveId(client)

  const folderPath = `Recruitment/${safeName(entityName)}/${safeName(vacancyTitle)}/Applications/${safeName(candidateEmail)}`
  const filePath = `${folderPath}/${safeFileName(fileName)}`

  const item = await client
    .api(`/drives/${driveId}/root:/${encodePathSegments(filePath)}:/content`)
    .putStream(content)

  return {
    driveId,
    itemId: item.id,
    webUrl: item.webUrl,
  }
}
