import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCertificateKeypair, pemToDer, calculateThumbprint } from '@/lib/certificate'
import { X509Certificate } from 'crypto'

describe('lib/certificate', () => {
  describe('generateCertificateKeypair', () => {
    it('generates a valid RSA 2048-bit keypair', () => {
      const result = generateCertificateKeypair('Test Entity')

      expect(result.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----')
      expect(result.privateKeyPem).toContain('-----END PRIVATE KEY-----')
      expect(result.publicCertPem).toContain('-----BEGIN CERTIFICATE-----')
      expect(result.publicCertPem).toContain('-----END CERTIFICATE-----')
    })

    it('produces a valid X.509 certificate', () => {
      const result = generateCertificateKeypair('Test Entity')
      const cert = new X509Certificate(result.publicCertPem)

      expect(cert.subject).toContain('CN=Test Entity')
    })

    it('generates certificate with 2-year expiry', () => {
      const before = new Date()
      const result = generateCertificateKeypair()
      const after = new Date()

      const expectedMinExpiry = new Date(before)
      expectedMinExpiry.setFullYear(expectedMinExpiry.getFullYear() + 2)
      const expectedMaxExpiry = new Date(after)
      expectedMaxExpiry.setFullYear(expectedMaxExpiry.getFullYear() + 2)

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry.getTime() - 1000)
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry.getTime() + 1000)
    })

    it('returns a SHA-1 thumbprint (40 hex chars)', () => {
      const result = generateCertificateKeypair()

      expect(result.thumbprint).toMatch(/^[0-9a-f]{40}$/)
    })

    it('completes within 5 seconds', () => {
      const start = Date.now()
      generateCertificateKeypair()
      const elapsed = Date.now() - start

      expect(elapsed).toBeLessThan(5000)
    })

    it('generates unique keypairs each time', () => {
      const result1 = generateCertificateKeypair()
      const result2 = generateCertificateKeypair()

      expect(result1.thumbprint).not.toEqual(result2.thumbprint)
      expect(result1.privateKeyPem).not.toEqual(result2.privateKeyPem)
    })

    it('uses default subject CN when none provided', () => {
      const result = generateCertificateKeypair()
      const cert = new X509Certificate(result.publicCertPem)

      expect(cert.subject).toContain('CN=Starterskalender Entra ID')
    })
  })

  describe('pemToDer', () => {
    it('converts PEM to DER buffer', () => {
      const result = generateCertificateKeypair()
      const der = pemToDer(result.publicCertPem)

      expect(der).toBeInstanceOf(Buffer)
      expect(der.length).toBeGreaterThan(0)
      // DER starts with SEQUENCE tag (0x30)
      expect(der[0]).toBe(0x30)
    })
  })

  describe('calculateThumbprint', () => {
    it('returns consistent thumbprint for same certificate', () => {
      const result = generateCertificateKeypair()
      const thumb1 = calculateThumbprint(result.publicCertPem)
      const thumb2 = calculateThumbprint(result.publicCertPem)

      expect(thumb1).toEqual(thumb2)
      expect(thumb1).toEqual(result.thumbprint)
    })
  })

  describe('encryption integration', () => {
    beforeEach(() => {
      vi.stubEnv('ENTRA_ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
    })

    it('private key can be encrypted and decrypted via lib/encryption', async () => {
      const { encryptEntra, decryptEntra } = await import('@/lib/encryption')
      const { privateKeyPem } = generateCertificateKeypair()

      const encrypted = encryptEntra(privateKeyPem)
      expect(encrypted).not.toEqual(privateKeyPem)

      const decrypted = decryptEntra(encrypted)
      expect(decrypted).toEqual(privateKeyPem)
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      vi.stubEnv('ENTRA_ENCRYPTION_KEY', '')
    })

    it('encryption fails gracefully without ENTRA_ENCRYPTION_KEY', async () => {
      const { encryptEntra } = await import('@/lib/encryption')
      const { privateKeyPem } = generateCertificateKeypair()

      expect(() => encryptEntra(privateKeyPem)).toThrow('ENTRA_ENCRYPTION_KEY')
    })
  })
})
