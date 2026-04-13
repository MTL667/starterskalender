import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: vi.fn().mockImplementation(() => ({
    acquireTokenByClientCredential: vi.fn().mockResolvedValue({ accessToken: 'mock-token' }),
  })),
}))

vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: vi.fn().mockReturnValue({
      api: vi.fn().mockReturnThis(),
      get: vi.fn(),
      putStream: vi.fn(),
      delete: vi.fn(),
      post: vi.fn(),
      responseType: vi.fn().mockReturnThis(),
    }),
  },
  ResponseType: { ARRAYBUFFER: 'arraybuffer' },
}))

describe('graph-teams', () => {
  beforeEach(() => {
    vi.stubEnv('AZURE_DOCS_TENANT_ID', 'test-tenant')
    vi.stubEnv('AZURE_DOCS_CLIENT_ID', 'test-client')
    vi.stubEnv('AZURE_DOCS_CLIENT_SECRET', 'test-secret')
    vi.stubEnv('TEAMS_SITE_ID', 'test-site')
  })

  describe('isDocsGraphConfigured', () => {
    it('returns true when all env vars are set', async () => {
      const { isDocsGraphConfigured } = await import('@/lib/graph-teams')
      expect(isDocsGraphConfigured()).toBe(true)
    })

    it('returns false when env vars are missing', async () => {
      vi.stubEnv('TEAMS_SITE_ID', '')
      const { isDocsGraphConfigured } = await import('@/lib/graph-teams')
      expect(isDocsGraphConfigured()).toBe(false)
    })
  })
})
