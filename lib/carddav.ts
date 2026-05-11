import { decrypt } from './crypto'

export interface CardDavConfig {
  url: string
  username: string
  password: string
  addressBook: string
}

export interface CardDavResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

interface StarterContact {
  firstName: string
  lastName: string
  phone?: string | null
  email?: string | null
  entityName?: string | null
  photoBase64?: string | null
  photoMimeType?: string | null
}

export function decryptConfig(entity: {
  cardDavUrl: string | null
  cardDavUsername: string | null
  cardDavPasswordEnc: string | null
  cardDavAddressBook: string | null
}): CardDavConfig {
  if (!entity.cardDavUrl || !entity.cardDavUsername || !entity.cardDavPasswordEnc || !entity.cardDavAddressBook) {
    throw new Error('Incomplete CardDAV configuration')
  }
  return {
    url: entity.cardDavUrl,
    username: entity.cardDavUsername,
    password: decrypt(entity.cardDavPasswordEnc),
    addressBook: entity.cardDavAddressBook,
  }
}

function authHeader(config: CardDavConfig): string {
  return 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64')
}

function vcfUrl(config: CardDavConfig, uid: string): string {
  const base = config.url.replace(/\/+$/, '')
  const book = config.addressBook.replace(/^\/+|\/+$/g, '')
  return `${base}/${book}/${encodeURIComponent(uid)}.vcf`
}

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

export function buildVCard(contact: StarterContact, uid: string): string {
  const fn = `${contact.firstName} ${contact.lastName}`.trim()
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `UID:${uid}`,
    `FN:${escapeVCardValue(fn)}`,
    `N:${escapeVCardValue(contact.lastName)};${escapeVCardValue(contact.firstName)};;;`,
  ]

  if (contact.phone) {
    lines.push(`TEL;TYPE=WORK:${escapeVCardValue(contact.phone)}`)
  }
  if (contact.email) {
    lines.push(`EMAIL;TYPE=WORK:${escapeVCardValue(contact.email)}`)
  }
  if (contact.entityName) {
    lines.push(`ORG:${escapeVCardValue(contact.entityName)}`)
  }
  if (contact.photoBase64 && contact.photoMimeType) {
    const type = contact.photoMimeType.replace('image/', '').toUpperCase()
    lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${contact.photoBase64}`)
  }

  lines.push(`REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export async function pushContact(
  config: CardDavConfig,
  uid: string,
  vCardString: string,
): Promise<CardDavResult> {
  try {
    const res = await fetch(vcfUrl(config, uid), {
      method: 'PUT',
      headers: {
        Authorization: authHeader(config),
        'Content-Type': 'text/vcard; charset=utf-8',
        'If-None-Match': '*',
      },
      body: vCardString,
    })
    if (res.status === 412) {
      const updateRes = await fetch(vcfUrl(config, uid), {
        method: 'PUT',
        headers: {
          Authorization: authHeader(config),
          'Content-Type': 'text/vcard; charset=utf-8',
        },
        body: vCardString,
      })
      if (!updateRes.ok) {
        return { success: false, error: `Update failed: ${updateRes.status} ${updateRes.statusText}` }
      }
    } else if (!res.ok) {
      return { success: false, error: `PUT failed: ${res.status} ${res.statusText}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function deleteContact(
  config: CardDavConfig,
  uid: string,
): Promise<CardDavResult> {
  try {
    const res = await fetch(vcfUrl(config, uid), {
      method: 'DELETE',
      headers: { Authorization: authHeader(config) },
    })
    if (res.status === 404) {
      return { success: true }
    }
    if (!res.ok) {
      return { success: false, error: `DELETE failed: ${res.status} ${res.statusText}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function getContact(
  config: CardDavConfig,
  uid: string,
): Promise<CardDavResult<string>> {
  try {
    const res = await fetch(vcfUrl(config, uid), {
      method: 'GET',
      headers: { Authorization: authHeader(config) },
    })
    if (!res.ok) {
      return { success: false, error: `GET failed: ${res.status} ${res.statusText}` }
    }
    return { success: true, data: await res.text() }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function updateContactNote(
  config: CardDavConfig,
  uid: string,
  note: string,
): Promise<CardDavResult> {
  const existing = await getContact(config, uid)
  if (!existing.success || !existing.data) {
    return { success: false, error: existing.error || 'Contact not found' }
  }

  let vcard = existing.data
  const noteEscaped = escapeVCardValue(note)

  if (/^NOTE:/m.test(vcard)) {
    vcard = vcard.replace(/^NOTE:.*$/m, `NOTE:${noteEscaped}`)
  } else {
    vcard = vcard.replace(/^END:VCARD/m, `NOTE:${noteEscaped}\r\nEND:VCARD`)
  }

  const res = await fetch(vcfUrl(config, uid), {
    method: 'PUT',
    headers: {
      Authorization: authHeader(config),
      'Content-Type': 'text/vcard; charset=utf-8',
    },
    body: vcard,
  })
  if (!res.ok) {
    return { success: false, error: `PUT note failed: ${res.status} ${res.statusText}` }
  }
  return { success: true }
}

export async function searchByName(
  config: CardDavConfig,
  fullName: string,
): Promise<CardDavResult<string | null>> {
  const base = config.url.replace(/\/+$/, '')
  const book = config.addressBook.replace(/^\/+|\/+$/g, '')
  const url = `${base}/${book}/`

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:addressbook-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
  <D:prop>
    <D:getetag/>
    <C:address-data>
      <C:prop name="UID"/>
      <C:prop name="FN"/>
    </C:address-data>
  </D:prop>
  <C:filter>
    <C:prop-filter name="FN">
      <C:text-match collation="i;unicode-casemap" match-type="contains">${escapeXml(fullName)}</C:text-match>
    </C:prop-filter>
  </C:filter>
</C:addressbook-query>`

  try {
    const res = await fetch(url, {
      method: 'REPORT',
      headers: {
        Authorization: authHeader(config),
        'Content-Type': 'application/xml; charset=utf-8',
        Depth: '1',
      },
      body,
    })
    if (!res.ok) {
      return { success: false, error: `REPORT failed: ${res.status} ${res.statusText}` }
    }

    const xml = await res.text()
    const hrefMatch = xml.match(/<D:href>[^<]*\/([^/<]+)\.vcf<\/D:href>/i)
    if (hrefMatch?.[1]) {
      return { success: true, data: decodeURIComponent(hrefMatch[1]) }
    }
    const uidMatch = xml.match(/UID[:\s]*([^\s<\r\n]+)/)
    return { success: true, data: uidMatch?.[1] || null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function testConnection(config: CardDavConfig): Promise<CardDavResult<boolean>> {
  const base = config.url.replace(/\/+$/, '')
  const book = config.addressBook.replace(/^\/+|\/+$/g, '')
  const url = `${base}/${book}/`

  try {
    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        Authorization: authHeader(config),
        'Content-Type': 'application/xml; charset=utf-8',
        Depth: '0',
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
    })
    if (res.ok || res.status === 207) {
      return { success: true, data: true }
    }
    return { success: false, error: `PROPFIND ${url} → ${res.status} ${res.statusText}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
