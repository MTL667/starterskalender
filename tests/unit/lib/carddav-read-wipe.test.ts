import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('CardDAV read wipe helpers', () => {
  let shouldSkipReadWipe: typeof import('@/lib/carddav').shouldSkipReadWipe
  let parseContactUidsFromPropfindXml: typeof import('@/lib/carddav').parseContactUidsFromPropfindXml
  let decryptReadConfig: typeof import('@/lib/carddav').decryptReadConfig
  let CARDDAV_READ_WIPE_BOOK: typeof import('@/lib/carddav').CARDDAV_READ_WIPE_BOOK
  let wipeAddressBook: typeof import('@/lib/carddav').wipeAddressBook

  beforeAll(async () => {
    process.env.CARDDAV_ENCRYPTION_KEY = TEST_KEY
    const mod = await import('@/lib/carddav')
    shouldSkipReadWipe = mod.shouldSkipReadWipe
    parseContactUidsFromPropfindXml = mod.parseContactUidsFromPropfindXml
    decryptReadConfig = mod.decryptReadConfig
    CARDDAV_READ_WIPE_BOOK = mod.CARDDAV_READ_WIPE_BOOK
    wipeAddressBook = mod.wipeAddressBook
  })

  afterAll(() => {
    delete process.env.CARDDAV_ENCRYPTION_KEY
  })

  it('uses fixed wipe book contacts', () => {
    expect(CARDDAV_READ_WIPE_BOOK).toBe('contacts')
  })

  it('skips when MASTER book equals contacts (case/trim insensitive)', () => {
    expect(shouldSkipReadWipe('contacts')).toBe(true)
    expect(shouldSkipReadWipe('Contacts')).toBe(true)
    expect(shouldSkipReadWipe('/contacts/')).toBe(true)
    expect(shouldSkipReadWipe(' contacts ')).toBe(true)
  })

  it('does not skip when MASTER book is a distinct shared book', () => {
    expect(shouldSkipReadWipe('EntityA')).toBe(false)
    expect(shouldSkipReadWipe(null)).toBe(false)
    expect(shouldSkipReadWipe(undefined)).toBe(false)
  })

  it('detects read credentials matching MASTER', async () => {
    const { isReadConfigSameAsMaster } = await import('@/lib/carddav')
    expect(
      isReadConfigSameAsMaster(
        {
          url: 'https://cloud.example.com/remote.php/dav/addressbooks/users/admin/',
          username: 'Admin',
        },
        {
          url: 'https://cloud.example.com/remote.php/dav/addressbooks/users/admin',
          username: 'admin',
        },
      ),
    ).toBe(true)
    expect(
      isReadConfigSameAsMaster(
        {
          url: 'https://cloud.example.com/remote.php/dav/addressbooks/users/read',
          username: 'read',
        },
        {
          url: 'https://cloud.example.com/remote.php/dav/addressbooks/users/admin',
          username: 'admin',
        },
      ),
    ).toBe(false)
  })

  it('decryptReadConfig always targets contacts', async () => {
    const { encrypt } = await import('@/lib/crypto')
    const config = decryptReadConfig({
      cardDavReadUrl: 'https://cloud.example.com/remote.php/dav/addressbooks/users/read-user',
      cardDavReadUsername: 'read-user',
      cardDavReadPasswordEnc: encrypt('secret'),
    })
    expect(config.addressBook).toBe('contacts')
    expect(config.username).toBe('read-user')
  })

  it('parses .vcf hrefs from PROPFIND multistatus XML', () => {
    const xml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/remote.php/dav/addressbooks/users/u/contacts/</d:href>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/addressbooks/users/u/contacts/alice%40example.com.vcf</d:href>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/addressbooks/users/u/contacts/bob-uid.vcf</d:href>
  </d:response>
</d:multistatus>`
    expect(parseContactUidsFromPropfindXml(xml)).toEqual([
      'alice@example.com',
      'bob-uid',
    ])
  })

  it('wipeAddressBook deletes listed contacts and continues on failures', async () => {
    const listedXml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response><d:href>/books/contacts/ok.vcf</d:href></d:response>
  <d:response><d:href>/books/contacts/fail.vcf</d:href></d:response>
</d:multistatus>`

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 207,
        text: async () => listedXml,
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' })

    vi.stubGlobal('fetch', fetchMock)

    const result = await wipeAddressBook({
      url: 'https://cloud.example.com/remote.php/dav/addressbooks/users/u',
      username: 'u',
      password: 'p',
      addressBook: 'contacts',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ wiped: 1, failed: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(3)

    vi.unstubAllGlobals()
  })

  it('wipeAddressBook returns zeros for empty book', async () => {
    const listedXml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response><d:href>/books/contacts/</d:href></d:response>
</d:multistatus>`
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 207,
        text: async () => listedXml,
      }),
    )
    const result = await wipeAddressBook({
      url: 'https://cloud.example.com/remote.php/dav/addressbooks/users/u',
      username: 'u',
      password: 'p',
      addressBook: 'contacts',
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ wiped: 0, failed: 0 })
    vi.unstubAllGlobals()
  })

  it('wipeAddressBook rejects non-contacts target', async () => {
    const result = await wipeAddressBook({
      url: 'https://cloud.example.com/remote.php/dav/addressbooks/users/u',
      username: 'u',
      password: 'p',
      addressBook: 'EntityA',
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Invalid wipe target/)
  })

  it('wipeAddressBook fails closed when listing fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }),
    )

    const result = await wipeAddressBook({
      url: 'https://cloud.example.com/remote.php/dav/addressbooks/users/u',
      username: 'u',
      password: 'p',
      addressBook: 'contacts',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/401/)
    vi.unstubAllGlobals()
  })
})
