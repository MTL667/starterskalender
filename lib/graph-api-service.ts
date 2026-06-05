import { ConfidentialClientApplication } from '@azure/msal-node'
import { prisma } from '@/lib/prisma'
import { decryptEntra } from '@/lib/encryption'

export class GraphApiError extends Error {
  constructor(message: string, public readonly retryable: boolean = false) {
    super(message)
    this.name = 'GraphApiError'
  }
}

export class GraphAuthError extends GraphApiError {
  constructor(message: string) {
    super(message, false)
    this.name = 'GraphAuthError'
  }
}

export class GraphTransientError extends GraphApiError {
  constructor(message: string) {
    super(message, true)
    this.name = 'GraphTransientError'
  }
}

export class GraphRateLimitError extends GraphApiError {
  public retryAfterMs: number
  constructor(message: string, retryAfterMs: number) {
    super(message, true)
    this.name = 'GraphRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

const MAX_RETRY_ATTEMPTS = 3
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'

interface SubscribedSku {
  skuId: string
  skuPartNumber: string
  consumedUnits: number
  prepaidUnits: { enabled: number }
}

export class GraphApiService {
  async getAuthenticatedClient(entityId: string): Promise<{ token: string }> {
    const connection = await prisma.entraAppConnection.findUnique({
      where: { entityId },
      select: {
        clientId: true,
        tenantId: true,
        encryptedPrivateKey: true,
        certificateThumbprint: true,
      },
    })

    if (!connection) {
      throw new GraphApiError('No Entra connection found for entity')
    }

    if (!connection.encryptedPrivateKey || !connection.certificateThumbprint) {
      throw new GraphApiError('Certificate not configured for this connection')
    }

    const privateKey = decryptEntra(connection.encryptedPrivateKey)

    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: connection.clientId,
        authority: `https://login.microsoftonline.com/${connection.tenantId}`,
        clientCertificate: {
          thumbprint: connection.certificateThumbprint,
          privateKey,
        },
      },
    })

    try {
      const result = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      })

      if (!result?.accessToken) {
        throw new GraphAuthError('Failed to acquire token — no access token returned')
      }

      return { token: result.accessToken }
    } catch (err: any) {
      if (err instanceof GraphApiError) throw err
      if (err.errorCode || err.name === 'ClientAuthError' || err.name === 'ClientConfigurationError') {
        throw new GraphAuthError(`Authentication failed: ${err.message}`)
      }
      throw new GraphTransientError(`Token acquisition failed: ${err.message}`)
    }
  }

  async validateConsent(entityId: string): Promise<{ valid: boolean; organizationName?: string }> {
    const { token } = await this.getAuthenticatedClient(entityId)
    return this.fetchWithRetry(
      `${GRAPH_BASE_URL}/organization`,
      token,
      async (data) => ({
        valid: true,
        organizationName: data.value?.[0]?.displayName,
      })
    )
  }

  async getSubscribedSkus(entityId: string): Promise<SubscribedSku[]> {
    const { token } = await this.getAuthenticatedClient(entityId)
    return this.fetchWithRetry(
      `${GRAPH_BASE_URL}/subscribedSkus`,
      token,
      async (data) =>
        (data.value || []).map((sku: any) => ({
          skuId: sku.skuId,
          skuPartNumber: sku.skuPartNumber,
          consumedUnits: sku.consumedUnits || 0,
          prepaidUnits: { enabled: sku.prepaidUnits?.enabled || 0 },
        }))
    )
  }

  async ensureHealthy(entityId: string): Promise<void> {
    const connection = await prisma.entraAppConnection.findUnique({
      where: { entityId },
      select: { consentStatus: true, certificateExpiry: true },
    })

    if (!connection) throw new GraphApiError('No Entra connection for entity')
    if (connection.consentStatus === 'error') throw new GraphAuthError('Connection is in error state — re-validate consent')

    const result = await this.validateConsent(entityId)
    if (!result.valid) throw new GraphAuthError('Consent validation failed')

    await prisma.entraAppConnection.update({
      where: { entityId },
      data: { consentStatus: 'healthy', lastConsentCheck: new Date() },
    })
  }

  private async fetchWithRetry<T>(
    url: string,
    token: string,
    transform: (data: any) => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    let response: Response

    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    } catch (err: any) {
      throw new GraphTransientError(`Network error: ${err.message}`)
    }

    if (response.ok) {
      const data = await response.json()
      return transform(data)
    }

    if (response.status === 401 || response.status === 403) {
      const body = await response.json().catch(() => ({}))
      throw new GraphAuthError(
        body.error?.message || `Graph API returned ${response.status}: consent may be revoked`
      )
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
      const retryAfterMs = retryAfter * 1000

      if (attempt >= MAX_RETRY_ATTEMPTS) {
        throw new GraphRateLimitError(
          `Rate limited after ${MAX_RETRY_ATTEMPTS} attempts`,
          retryAfterMs
        )
      }

      await new Promise((resolve) => setTimeout(resolve, retryAfterMs))
      return this.fetchWithRetry(url, token, transform, attempt + 1)
    }

    if (response.status >= 500) {
      throw new GraphTransientError(`Graph API server error: ${response.status}`)
    }

    const body = await response.json().catch(() => ({}))
    throw new GraphApiError(body.error?.message || `Unexpected response: ${response.status}`)
  }
}

export const graphApiService = new GraphApiService()
