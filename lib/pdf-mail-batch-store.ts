import type { PdfMailRecipient } from '@/lib/pdf-mailer'

export type UploadedPdfMeta = {
  fileName: string
  storagePath: string
}

export function asRecipientsJson(value: unknown): PdfMailRecipient[] {
  if (!Array.isArray(value)) return []
  const out: PdfMailRecipient[] = []
  for (const r of value) {
    if (!r || typeof r !== 'object') continue
    const email = String((r as { email?: unknown }).email || '').trim().toLowerCase()
    if (!email) continue
    const rawName = (r as { name?: unknown }).name
    const name = rawName != null ? String(rawName).trim() || null : null
    out.push({ email, name })
  }
  return out
}

export function asUploadedPdfs(value: unknown): UploadedPdfMeta[] {
  if (!Array.isArray(value)) return []
  return value
    .map((p) => {
      if (!p || typeof p !== 'object') return null
      const fileName = String((p as any).fileName || '').trim()
      const storagePath = String((p as any).storagePath || '').trim()
      if (!fileName || !storagePath) return null
      return { fileName, storagePath }
    })
    .filter((p): p is UploadedPdfMeta => Boolean(p))
}
