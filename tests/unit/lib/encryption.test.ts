import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('lib/encryption (Entra)', () => {
  let encryptEntra: typeof import('@/lib/encryption').encryptEntra
  let decryptEntra: typeof import('@/lib/encryption').decryptEntra

  beforeAll(async () => {
    process.env.ENTRA_ENCRYPTION_KEY = TEST_KEY
    const mod = await import('@/lib/encryption')
    encryptEntra = mod.encryptEntra
    decryptEntra = mod.decryptEntra
  })

  afterAll(() => {
    delete process.env.ENTRA_ENCRYPTION_KEY
  })

  it('encrypts and decrypts a plaintext value correctly', () => {
    const plaintext = 'my-secret-private-key-content'
    const encrypted = encryptEntra(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(encrypted.length).toBeGreaterThan(0)
    const decrypted = decryptEntra(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const plaintext = 'same-value'
    const a = encryptEntra(plaintext)
    const b = encryptEntra(plaintext)
    expect(a).not.toBe(b)
    expect(decryptEntra(a)).toBe(plaintext)
    expect(decryptEntra(b)).toBe(plaintext)
  })

  it('handles empty string encryption/decryption', () => {
    const encrypted = encryptEntra('')
    expect(decryptEntra(encrypted)).toBe('')
  })

  it('handles unicode content', () => {
    const plaintext = '🔐 Gëhéim wàchtwoord ñ'
    const encrypted = encryptEntra(plaintext)
    expect(decryptEntra(encrypted)).toBe(plaintext)
  })

  it('throws on malformed ciphertext (too short)', () => {
    expect(() => decryptEntra('abc')).toThrow('Invalid ciphertext: too short')
  })

  it('throws on tampered ciphertext', () => {
    const encrypted = encryptEntra('test')
    const buf = Buffer.from(encrypted, 'base64')
    buf[buf.length - 1] ^= 0xff
    const tampered = buf.toString('base64')
    expect(() => decryptEntra(tampered)).toThrow()
  })

  it('throws when ENTRA_ENCRYPTION_KEY is missing', async () => {
    const originalKey = process.env.ENTRA_ENCRYPTION_KEY
    delete process.env.ENTRA_ENCRYPTION_KEY

    const freshModule = await import('@/lib/encryption') as any
    // Force re-evaluation by testing the error path directly
    // The module caches getKey() per call, so we need to test behavior with missing key
    process.env.ENTRA_ENCRYPTION_KEY = ''
    expect(() => freshModule.encryptEntra('test')).toThrow('ENTRA_ENCRYPTION_KEY must be a 64-char hex string')

    process.env.ENTRA_ENCRYPTION_KEY = originalKey
  })

  it('throws when ENTRA_ENCRYPTION_KEY is wrong length', async () => {
    const originalKey = process.env.ENTRA_ENCRYPTION_KEY
    process.env.ENTRA_ENCRYPTION_KEY = 'too-short'
    const mod = await import('@/lib/encryption')
    expect(() => mod.encryptEntra('test')).toThrow('ENTRA_ENCRYPTION_KEY must be a 64-char hex string')
    process.env.ENTRA_ENCRYPTION_KEY = originalKey
  })
})
