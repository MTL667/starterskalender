import { generateKeyPairSync, createHash, createSign } from 'crypto'

const CERT_VALIDITY_YEARS = 2
const KEY_SIZE = 2048

interface CertificateKeypair {
  privateKeyPem: string
  publicCertPem: string
  thumbprint: string
  expiresAt: Date
}

export function generateCertificateKeypair(subjectCN?: string): CertificateKeypair {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: KEY_SIZE,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setFullYear(expiresAt.getFullYear() + CERT_VALIDITY_YEARS)

  const cn = subjectCN || 'Starterskalender Entra ID'
  const cert = createSelfSignedCert(privateKey, publicKey, cn, now, expiresAt)

  const thumbprint = calculateThumbprint(cert)

  return {
    privateKeyPem: privateKey,
    publicCertPem: cert,
    thumbprint,
    expiresAt,
  }
}

export function pemToDer(pem: string): Buffer {
  const lines = pem.split('\n').filter(l => !l.startsWith('-----') && l.trim() !== '')
  return Buffer.from(lines.join(''), 'base64')
}

export function calculateThumbprint(certPem: string): string {
  const der = pemToDer(certPem)
  return createHash('sha1').update(der).digest('hex')
}

function createSelfSignedCert(
  privateKeyPem: string,
  publicKeyPem: string,
  cn: string,
  notBefore: Date,
  notAfter: Date
): string {
  const serialNumber = BigInt('0x' + createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .slice(0, 16))

  const subject = encodeDN(cn)
  const validity = encodeValidity(notBefore, notAfter)
  const pubKeyInfo = extractPublicKeyInfo(publicKeyPem)
  const serial = encodeInteger(serialNumber)

  const tbs = encodeTBSCertificate(serial, subject, validity, pubKeyInfo)

  const sign = createSign('SHA256')
  sign.update(tbs)
  const signature = sign.sign(privateKeyPem)

  const cert = encodeSequence(
    Buffer.concat([
      tbs,
      encodeAlgorithmIdentifier(),
      encodeBitString(signature),
    ])
  )

  const b64 = cert.toString('base64')
  const lines = b64.match(/.{1,64}/g) || []
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`
}

function encodeTBSCertificate(
  serial: Buffer,
  subject: Buffer,
  validity: Buffer,
  pubKeyInfo: Buffer
): Buffer {
  const version = Buffer.from([0xa0, 0x03, 0x02, 0x01, 0x02])
  const algId = encodeAlgorithmIdentifier()

  return encodeSequence(
    Buffer.concat([version, serial, algId, subject, validity, subject, pubKeyInfo])
  )
}

function encodeAlgorithmIdentifier(): Buffer {
  // SHA256withRSA OID: 1.2.840.113549.1.1.11
  const oid = Buffer.from([
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b,
    0x05, 0x00, // NULL parameters
  ])
  return encodeSequence(oid)
}

function encodeDN(cn: string): Buffer {
  // OID for commonName: 2.5.4.3
  const cnOid = Buffer.from([0x06, 0x03, 0x55, 0x04, 0x03])
  const cnValue = encodeUTF8String(cn)
  const attrTypeAndValue = encodeSequence(Buffer.concat([cnOid, cnValue]))
  const rdnSet = encodeSet(attrTypeAndValue)
  return encodeSequence(rdnSet)
}

function encodeValidity(notBefore: Date, notAfter: Date): Buffer {
  return encodeSequence(Buffer.concat([
    encodeUTCTime(notBefore),
    encodeUTCTime(notAfter),
  ]))
}

function encodeInteger(value: bigint): Buffer {
  let hex = value.toString(16)
  if (hex.length % 2 !== 0) hex = '0' + hex
  if (parseInt(hex[0], 16) >= 8) hex = '00' + hex
  const bytes = Buffer.from(hex, 'hex')
  return Buffer.concat([Buffer.from([0x02]), encodeLength(bytes.length), bytes])
}

function encodeUTF8String(str: string): Buffer {
  const bytes = Buffer.from(str, 'utf8')
  return Buffer.concat([Buffer.from([0x0c]), encodeLength(bytes.length), bytes])
}

function encodeUTCTime(date: Date): Buffer {
  const y = date.getUTCFullYear() % 100
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const d = date.getUTCDate().toString().padStart(2, '0')
  const h = date.getUTCHours().toString().padStart(2, '0')
  const min = date.getUTCMinutes().toString().padStart(2, '0')
  const s = date.getUTCSeconds().toString().padStart(2, '0')
  const timeStr = `${y.toString().padStart(2, '0')}${m}${d}${h}${min}${s}Z`
  const bytes = Buffer.from(timeStr, 'ascii')
  return Buffer.concat([Buffer.from([0x17]), encodeLength(bytes.length), bytes])
}

function encodeBitString(data: Buffer): Buffer {
  const content = Buffer.concat([Buffer.from([0x00]), data])
  return Buffer.concat([Buffer.from([0x03]), encodeLength(content.length), content])
}

function encodeSequence(content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30]), encodeLength(content.length), content])
}

function encodeSet(content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x31]), encodeLength(content.length), content])
}

function encodeLength(length: number): Buffer {
  if (length < 128) {
    return Buffer.from([length])
  }
  if (length < 256) {
    return Buffer.from([0x81, length])
  }
  if (length < 65536) {
    return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff])
  }
  return Buffer.from([0x83, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff])
}

function extractPublicKeyInfo(publicKeyPem: string): Buffer {
  return pemToDer(publicKeyPem)
}
