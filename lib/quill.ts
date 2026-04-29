/**
 * Quill API client (Dioss Smart Solutions) — QES signing via itsme/eID.
 *
 * API docs: https://quill.dioss.com/docs/technical/introduction/
 * Swagger:  https://quill.dioss.com/docs/swagger-ui/?urls.primaryName=v2
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getConfig() {
  const apiUrl = process.env.QUILL_API_URL
  const clientId = process.env.QUILL_CLIENT_ID
  const apiKey = process.env.QUILL_API_KEY
  if (!apiUrl || !clientId || !apiKey) {
    throw new Error(
      'Quill niet geconfigureerd: QUILL_API_URL, QUILL_CLIENT_ID en QUILL_API_KEY zijn vereist',
    )
  }
  return { apiUrl: apiUrl.replace(/\/+$/, ''), clientId, apiKey }
}

export function isQuillConfigured(): boolean {
  return !!(
    process.env.QUILL_API_URL &&
    process.env.QUILL_CLIENT_ID &&
    process.env.QUILL_API_KEY
  )
}

export type QuillSignatureType = 'ITSME' | 'BELGIAN_EID' | 'SMS_OTP'

export function getDefaultSignatureTypes(): QuillSignatureType[] {
  const env = process.env.QUILL_SIGNATURE_TYPES
  if (env) {
    return env.split(',').map((s) => s.trim()).filter(Boolean) as QuillSignatureType[]
  }
  return ['ITSME']
}

// ---------------------------------------------------------------------------
// Token caching — client_credentials JWT with 5 min TTL
// ---------------------------------------------------------------------------

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken

  const { apiUrl, clientId, apiKey } = getConfig()

  const res = await fetch(
    `${apiUrl}/auth/realms/dioss/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: apiKey,
        grant_type: 'client_credentials',
      }),
    },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Quill token request failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  if (!data.access_token) {
    throw new Error('Quill token response missing access_token')
  }
  cachedToken = data.access_token as string
  const expiresIn = Math.max(60, Number(data.expires_in) || 300)
  tokenExpiresAt = Date.now() + (expiresIn - 30) * 1000
  return cachedToken!
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function quillFetch(
  path: string,
  init?: RequestInit & { rawBody?: boolean },
): Promise<Response> {
  const { apiUrl } = getConfig()
  let token = await getToken()
  const url = `${apiUrl}${path}`

  const doFetch = (t: string) =>
    fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${t}`,
        ...(init?.rawBody ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    })

  let res = await doFetch(token)

  if (res.status === 401) {
    cachedToken = null
    tokenExpiresAt = 0
    token = await getToken()
    res = await doFetch(token)
  }

  return res
}

async function quillJson<T = any>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await quillFetch(path, init)
  const text = await res.text()
  if (!res.ok) {
    throw new QuillApiError(res.status, text, path)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new QuillApiError(res.status, `Non-JSON response: ${text.slice(0, 200)}`, path)
  }
}

export class QuillApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string,
  ) {
    super(`Quill API error ${status} on ${path}: ${body.slice(0, 300)}`)
    this.name = 'QuillApiError'
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function createGuestUser(
  email: string,
  firstName: string,
  lastName: string,
): Promise<{ id: number }> {
  return quillJson('/api/rest/v2/users/create-guest', {
    method: 'POST',
    body: JSON.stringify({
      email,
      firstName,
      lastName,
      allowUpdate: true,
      enabledNotifications: [],
    }),
  })
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

interface CreateDocumentOptions {
  name: string
  webhookUrl: string
  signerUserId: number
  signatureTypes: QuillSignatureType[]
  redirectUrl?: string
  signatureLocation?: {
    pageIndex: number
    relativeLocationX: number
    relativeLocationY: number
    relativeWidth?: number
    relativeHeight?: number
  }
  signaturePlaceholder?: string
}

export async function createDocument(
  opts: CreateDocumentOptions,
): Promise<{ documentId: number }> {
  const location = opts.signaturePlaceholder
    ? { placeholder: opts.signaturePlaceholder }
    : opts.signatureLocation ?? {
        pageIndex: 0,
        relativeLocationX: 0.1,
        relativeLocationY: 0.85,
        relativeWidth: 0.35,
        relativeHeight: 0.08,
      }

  return quillJson('/api/rest/v2/documents/create', {
    method: 'POST',
    body: JSON.stringify({
      name: opts.name,
      contentType: 'application/pdf',
      webhookUrl: opts.webhookUrl,
      signatures: [
        {
          userId: opts.signerUserId,
          signatureTypes: opts.signatureTypes,
          redirectUrl: opts.redirectUrl,
          location,
        },
      ],
    }),
  })
}

export async function uploadDocumentBinary(
  quillDocumentId: number,
  pdfBuffer: Buffer | Uint8Array,
): Promise<void> {
  const { apiUrl } = getConfig()
  const url = `${apiUrl}/api/rest/v2/documents/${quillDocumentId}/upload-multipart`

  const buf = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer)
  const ab = new ArrayBuffer(buf.byteLength)
  new Uint8Array(ab).set(buf)
  const blob = new Blob([ab], { type: 'application/pdf' })

  const doUpload = async (token: string) => {
    const form = new FormData()
    form.append('file', blob, 'document.pdf')
    return fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  }

  let token = await getToken()
  let res = await doUpload(token)

  if (res.status === 401) {
    cachedToken = null
    tokenExpiresAt = 0
    token = await getToken()
    res = await doUpload(token)
  }

  if (!res.ok) {
    const body = await res.text()
    throw new QuillApiError(
      res.status,
      body,
      `/documents/${quillDocumentId}/upload-multipart`,
    )
  }
}

export async function sendDocument(quillDocumentId: number): Promise<void> {
  const res = await quillFetch(
    `/api/rest/v2/documents/${quillDocumentId}/send`,
    { method: 'POST' },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new QuillApiError(
      res.status,
      body,
      `/documents/${quillDocumentId}/send`,
    )
  }
}

// ---------------------------------------------------------------------------
// Signing URLs
// ---------------------------------------------------------------------------

interface SigningUrlResponse {
  userId: number
  documentSignRequestUrls: Array<{
    documentId: number
    signRequestUrls: Array<{
      userId: number
      guestUrl: string
    }>
  }>
}

export async function getSigningUrl(
  quillDocumentId: number,
  quillUserId: number,
): Promise<string> {
  const data = await quillJson<SigningUrlResponse>(
    '/api/rest/v2/urls/create',
    {
      method: 'POST',
      body: JSON.stringify({
        documentIds: [quillDocumentId],
        userId: quillUserId,
      }),
    },
  )

  const docEntry = data.documentSignRequestUrls?.find(
    (d) => d.documentId === quillDocumentId,
  )
  const guestUrl = docEntry?.signRequestUrls?.[0]?.guestUrl
  if (!guestUrl) {
    throw new Error(
      `Quill returned no signing URL for document ${quillDocumentId}`,
    )
  }
  return guestUrl
}

// ---------------------------------------------------------------------------
// Document status & download
// ---------------------------------------------------------------------------

export interface QuillDocumentStatus {
  id: number
  name: string
  state: string
  creationError?: string
}

export async function getDocumentStatus(
  quillDocumentId: number,
): Promise<QuillDocumentStatus> {
  return quillJson(`/api/rest/v2/documents/${quillDocumentId}`)
}

export async function downloadSignedDocument(
  quillDocumentId: number,
): Promise<Buffer> {
  const res = await quillFetch(
    `/api/rest/v2/documents/${quillDocumentId}/artifacts?type=DOCUMENT`,
  )
  if (!res.ok) {
    const body = await res.text()
    throw new QuillApiError(
      res.status,
      body,
      `/documents/${quillDocumentId}/artifacts`,
    )
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
