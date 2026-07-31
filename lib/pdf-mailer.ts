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

function splitCsvLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''))
}

function detectDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) || []).length
  const commas = (headerLine.match(/,/g) || []).length
  if (semis > commas) return ';'
  if (commas > 0) return ','
  return semis > 0 ? ';' : ','
}

function isEmailHeader(header: string): boolean {
  // Normalize fancy dashes so "Werk – E-mail" still matches
  const h = header.toLowerCase().trim().replace(/[\u2010-\u2015]/g, '-')
  if (!h) return false
  if (h === 'email' || h === 'e-mail' || h === 'mail') return true
  // "Werk - E-mail", "work email", "e_mail"
  if (/e-?mail/.test(h)) return true
  return false
}

function isNameHeader(header: string): boolean {
  const h = header.toLowerCase().trim()
  return h === 'name' || h === 'naam' || h === 'full name' || h === 'volledige naam' || h === 'display name'
}

function findEmailInParts(parts: string[]): string {
  const hit = parts.find(p => EMAIL_RE.test(p.trim()))
  return hit?.trim() || ''
}

/**
 * Parse paste (one email per line) or CSV.
 * Supports EN headers (email,name) and BE/NL variants (Naam;Werk - E-mail) with `;`.
 */
export function parseRecipientList(raw: string): { recipients: PdfMailRecipient[]; errors: string[] } {
  const recipients: PdfMailRecipient[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  const text = raw.replace(/^\uFEFF/, '').trim()
  if (!text) return { recipients, errors: ['Empty recipient list'] }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { recipients, errors: ['Empty recipient list'] }

  const delimiter = detectDelimiter(lines[0])
  const headerParts = splitCsvLine(lines[0], delimiter)
  const multiColumn = headerParts.length > 1
  const emailHeaderIdx = headerParts.findIndex(isEmailHeader)
  const nameHeaderIdx = headerParts.findIndex(isNameHeader)
  const firstLineHasEmail = Boolean(findEmailInParts(headerParts))
  // Header row: known column names, or multi-column first line with no email cell
  const looksLikeHeader =
    (multiColumn && (emailHeaderIdx >= 0 || nameHeaderIdx >= 0)) ||
    (multiColumn && !firstLineHasEmail) ||
    (!multiColumn && ['email', 'e-mail', 'mail', 'name', 'naam'].includes(headerParts[0]?.toLowerCase()))

  const dataLines = looksLikeHeader ? lines.slice(1) : lines
  const emailIdx = emailHeaderIdx >= 0 ? emailHeaderIdx : looksLikeHeader ? -1 : 0
  const nameIdx = nameHeaderIdx >= 0 ? nameHeaderIdx : -1

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]
    let email = line
    let name: string | null = null
    const parts =
      line.includes(delimiter) || looksLikeHeader ? splitCsvLine(line, delimiter) : [line]

    if (parts.length > 1 || looksLikeHeader) {
      if (emailIdx >= 0) {
        email = parts[emailIdx] || ''
      } else {
        email = findEmailInParts(parts)
      }
      if (nameIdx >= 0) {
        name = parts[nameIdx] || null
      }
    }

    email = email.trim().toLowerCase()
    // Fallback: chosen column was a name — pick the cell that looks like an email
    if ((!email || !EMAIL_RE.test(email)) && parts.length > 1) {
      const found = findEmailInParts(parts)
      if (found) email = found.trim().toLowerCase()
    }
    // Name = first non-email cell when header didn't name a name column
    if ((!name || name.trim().toLowerCase() === email) && parts.length > 1 && email) {
      name = parts.find(p => p.trim().toLowerCase() !== email)?.trim() || null
    }

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
