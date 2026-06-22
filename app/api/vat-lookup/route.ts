import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'

const TIMEOUT_MS = 8000
const MAX_RETRIES = 2

interface ParsedAddress {
  street?: string
  number?: string
  postalCode?: string
  city?: string
  country?: string
}

interface VatLookupResult {
  valid: boolean
  companyName?: string
  address?: ParsedAddress
  legalForm?: string
  error?: string
}

function parseAddress(raw: string, countryCode: string): ParsedAddress {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const result: ParsedAddress = { country: countryCode }

  if (lines.length >= 2) {
    const streetLine = lines[0]
    const streetMatch = streetLine.match(/^(.+?)\s+(\d+\S*)$/)
    if (streetMatch) {
      result.street = streetMatch[1]
      result.number = streetMatch[2]
    } else {
      result.street = streetLine
    }

    const cityLine = lines[lines.length - 1]
    const cityMatch = cityLine.match(/^(\d{4,6})\s+(.+)$/)
    if (cityMatch) {
      result.postalCode = cityMatch[1]
      result.city = cityMatch[2]
    } else {
      result.city = cityLine
    }
  } else if (lines.length === 1) {
    result.street = lines[0]
  }

  return result
}

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout))
}

function parseVatInput(raw: string): { countryCode: string; vatNumber: string } | null {
  const normalized = raw.replace(/[\s.]/g, '').toUpperCase()
  const match = normalized.match(/^([A-Z]{2})([A-Z0-9]+)$/)
  if (!match) return null
  return { countryCode: match[1], vatNumber: match[2] }
}

async function lookupVies(countryCode: string, vatNumber: string): Promise<VatLookupResult> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ countryCode, vatNumber }),
        },
      )

      if (!res.ok) {
        if (attempt < MAX_RETRIES - 1) continue
        return { valid: false, error: 'VIES service unavailable' }
      }

      const data = await res.json()

      if (!data.valid) {
        return { valid: false, error: 'Invalid VAT number' }
      }

      const rawAddress = typeof data.address === 'string'
        ? data.address.replace(/\\n/g, '\n').trim()
        : undefined

      return {
        valid: true,
        companyName: data.name?.trim() || undefined,
        address: rawAddress ? parseAddress(rawAddress, countryCode) : undefined,
      }
    } catch {
      if (attempt < MAX_RETRIES - 1) continue
      return { valid: false, error: 'VIES service timeout' }
    }
  }

  return { valid: false, error: 'VIES service unavailable' }
}

async function lookupKboLegalForm(enterpriseNumber: string): Promise<string | undefined> {
  const url = `https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${encodeURIComponent(enterpriseNumber)}&actionLu=Zoek`
  const res = await fetchWithTimeout(url, {
    headers: { Accept: 'text/html' },
  })

  if (!res.ok) return undefined

  const html = await res.text()

  // KBO page structure: <td class="QL">Rechtsvorm:\n</td><td class="QL" colspan="3">\nVZW\n<br/><span class="upd">Sinds ...</span></td>
  const patterns = [
    /Rechtsvorm:\s*<\/td>\s*<td[^>]*>\s*([^<\n]+)/i,
    /Forme juridique:\s*<\/td>\s*<td[^>]*>\s*([^<\n]+)/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const value = match[1].trim()
      if (value && value.length < 100 && !value.match(/^Sinds\s/i)) return value
    }
  }

  return undefined
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const vatNumber = request.nextUrl.searchParams.get('vatNumber')?.trim()
    if (!vatNumber) {
      return NextResponse.json({ valid: false, error: 'Missing vatNumber parameter' }, { status: 400 })
    }

    const parsed = parseVatInput(vatNumber)
    if (!parsed) {
      return NextResponse.json({ valid: false, error: 'Invalid VAT number format' })
    }

    const viesResult = await lookupVies(parsed.countryCode, parsed.vatNumber)
    if (!viesResult.valid) {
      return NextResponse.json(viesResult)
    }

    let legalForm = viesResult.legalForm
    if (parsed.countryCode === 'BE') {
      try {
        const kboLegalForm = await lookupKboLegalForm(parsed.vatNumber)
        if (kboLegalForm) legalForm = kboLegalForm
      } catch {
        // KBO enrichment is best-effort
      }
    }

    return NextResponse.json({
      valid: true,
      companyName: viesResult.companyName,
      address: viesResult.address,
      legalForm,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('Unauthorized') || message.includes('Forbidden')) {
      return NextResponse.json({ valid: false, error: message }, { status: 403 })
    }
    console.error('VAT lookup error:', error)
    return NextResponse.json({
      valid: false,
      error: 'VAT lookup failed',
    })
  }
}
