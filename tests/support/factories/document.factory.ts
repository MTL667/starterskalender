interface MockDocument {
  id: string
  title: string
  status: 'PENDING' | 'SIGNED' | 'CANCELLED'
  signingMethod: 'SES' | 'QES'
  fileName: string
  fileSize: number
  mimeType: string
  starterId: string
  teamsDriveId: string | null
  teamsItemId: string | null
  teamsPath: string | null
  signingToken: string | null
  signatureFields: any[] | null
  signedAt: Date | null
  signedByName: string | null
}

let counter = 0

export function createMockDocument(overrides: Partial<MockDocument> = {}): MockDocument {
  counter++
  return {
    id: `doc-${counter}`,
    title: `Test Document ${counter}`,
    status: 'PENDING',
    signingMethod: 'SES',
    fileName: `test-document-${counter}.pdf`,
    fileSize: 1024 * 50,
    mimeType: 'application/pdf',
    starterId: 'starter-1',
    teamsDriveId: 'drive-123',
    teamsItemId: 'item-456',
    teamsPath: 'Aceg/Test Starter/test-document.pdf',
    signingToken: `token-${counter}-${Date.now()}`,
    signatureFields: null,
    signedAt: null,
    signedByName: null,
    ...overrides,
  }
}

export function createSignedDocument(overrides: Partial<MockDocument> = {}): MockDocument {
  return createMockDocument({
    status: 'SIGNED',
    signedAt: new Date(),
    signedByName: 'Test Signer',
    fileName: 'test-document-signed.pdf',
    ...overrides,
  })
}
