export type PdfMailRecipient = {
  email: string
  name?: string | null
}

export type PdfMailFile = {
  fileName: string
  storagePath: string
}

export type PairingResult = {
  pairs: Array<{
    sortIndex: number
    recipient: PdfMailRecipient
    pdf: PdfMailFile
  }>
  leftoverEmails: string[]
  leftoverPdfNames: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

/** Parse paste (one email per line) or CSV with email[,name]. */
export function parseRecipientList(raw: string): { recipients: PdfMailRecipient[]; errors: string[] } {
  const recipients: PdfMailRecipient[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  const text = raw.replace(/^\uFEFF/, '').trim()
  if (!text) return { recipients, errors: ['Empty recipient list'] }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { recipients, errors: ['Empty recipient list'] }

  const first = lines[0].toLowerCase()
  const looksLikeHeader = first.includes('email') && (first.includes(',') || first.includes(';'))
  const dataLines = looksLikeHeader ? lines.slice(1) : lines
  const delimiter = text.includes(';') && !text.includes(',') ? ';' : ','

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]
    let email = line
    let name: string | null = null

    if (line.includes(delimiter)) {
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''))
      const emailIdx = looksLikeHeader
        ? first.split(/[,;]/).map(h => h.trim()).findIndex(h => h === 'email')
        : 0
      const nameIdx = looksLikeHeader
        ? first.split(/[,;]/).map(h => h.trim()).findIndex(h => h === 'name')
        : 1
      email = parts[emailIdx >= 0 ? emailIdx : 0] || ''
      name = nameIdx >= 0 ? parts[nameIdx] || null : parts[1] || null
    }

    email = email.trim().toLowerCase()
    if (!email) {
      errors.push(`Line ${i + 1}: empty email`)
      continue
    }
    if (!EMAIL_RE.test(email)) {
      errors.push(`Line ${i + 1}: invalid email "${email}"`)
      continue
    }
    if (seen.has(email)) {
      errors.push(`Line ${i + 1}: duplicate email "${email}"`)
      continue
    }
    seen.add(email)
    recipients.push({ email, name: name?.trim() || null })
  }

  return { recipients, errors }
}

/** Pair recipients and PDFs by index order. */
export function pairRecipientsAndPdfs(
  recipients: PdfMailRecipient[],
  pdfs: PdfMailFile[]
): PairingResult {
  const count = Math.min(recipients.length, pdfs.length)
  const pairs = []
  for (let i = 0; i < count; i++) {
    pairs.push({ sortIndex: i, recipient: recipients[i], pdf: pdfs[i] })
  }
  return {
    pairs,
    leftoverEmails: recipients.slice(count).map(r => r.email),
    leftoverPdfNames: pdfs.slice(count).map(p => p.fileName),
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderPdfMailTemplate(
  template: string,
  vars: { name?: string | null; email: string; filename: string },
  options?: { escapeHtml?: boolean }
): string {
  const name = vars.name?.trim() || vars.email
  const esc = options?.escapeHtml ? escapeHtml : (v: string) => v
  return template
    .replace(/\{name\}/gi, esc(name))
    .replace(/\{email\}/gi, esc(vars.email))
    .replace(/\{filename\}/gi, esc(vars.filename))
}

export function isPdfFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf')
}

/** Reject non-PDF payloads even if the filename ends with .pdf */
export function looksLikePdf(bytes: Buffer | Uint8Array): boolean {
  if (bytes.length < 5) return false
  return Buffer.from(bytes.subarray(0, 5)).toString('utf8') === '%PDF-'
}
