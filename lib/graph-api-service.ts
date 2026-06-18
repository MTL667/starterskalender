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

  // ─── Offboarding Pre-flight Methods ──────────────────────────────────────────

  async checkLitigationHold(entityId: string, userId: string): Promise<boolean> {
    // Graph API v1.0 does not expose litigation hold status directly.
    // This would require Exchange Online PowerShell or Compliance API.
    // Return false to avoid false positives until a proper integration is added.
    return false
  }

  async getMailboxStatistics(entityId: string, userId: string): Promise<{ mailboxSizeMb: number }> {
    const { token } = await this.getAuthenticatedClient(entityId)
    return this.fetchWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/mailFolders/inbox?$select=totalItemCount,sizeInBytes`,
      token,
      async (data) => ({
        mailboxSizeMb: Math.round((data.sizeInBytes || 0) / (1024 * 1024)),
      })
    )
  }

  async getUserOwnedGroups(entityId: string, userId: string): Promise<{ groupId: string; groupName: string }[]> {
    const { token } = await this.getAuthenticatedClient(entityId)
    return this.fetchWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/ownedObjects/microsoft.graph.group?$select=id,displayName`,
      token,
      async (data) =>
        (data.value || []).map((g: any) => ({
          groupId: g.id,
          groupName: g.displayName,
        }))
    )
  }

  // ─── Offboarding Execution Methods ─────────────────────────────────────────

  async setOutOfOffice(entityId: string, userId: string, internalMessage: string, externalMessage: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.patchWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/mailboxSettings`,
      token,
      {
        automaticRepliesSetting: {
          status: 'alwaysEnabled',
          internalReplyMessage: internalMessage,
          externalReplyMessage: externalMessage,
        },
      }
    )
  }

  async disableUser(entityId: string, userId: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.patchWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}`,
      token,
      { accountEnabled: false }
    )
  }

  async revokeSignInSessions(entityId: string, userId: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.postWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/revokeSignInSessions`,
      token,
      {}
    )
  }

  async getUserCalendarEvents(entityId: string, userId: string): Promise<{ id: string; subject: string }[]> {
    const { token } = await this.getAuthenticatedClient(entityId)
    const now = new Date().toISOString()
    return this.fetchWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/events?$filter=start/dateTime ge '${now}' and isOrganizer eq true&$select=id,subject&$top=999`,
      token,
      async (data) =>
        (data.value || []).map((e: any) => ({ id: e.id, subject: e.subject }))
    )
  }

  async cancelCalendarEvent(entityId: string, userId: string, eventId: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.postWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/events/${eventId}/cancel`,
      token,
      { comment: 'This meeting has been cancelled due to the organizer leaving the organization.' }
    )
  }

  async transferGroupOwnership(entityId: string, groupId: string, fromUserId: string, toUserId: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.postWithRetry(
      `${GRAPH_BASE_URL}/groups/${groupId}/owners/$ref`,
      token,
      { '@odata.id': `${GRAPH_BASE_URL}/users/${toUserId}` }
    )
    await this.deleteWithRetry(
      `${GRAPH_BASE_URL}/groups/${groupId}/owners/${fromUserId}/$ref`,
      token
    )
  }

  async removeGroupMember(entityId: string, groupId: string, userId: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.deleteWithRetry(
      `${GRAPH_BASE_URL}/groups/${groupId}/members/${userId}/$ref`,
      token
    )
  }

  async getUserMailRules(entityId: string, userId: string): Promise<{ id: string; displayName: string }[]> {
    const { token } = await this.getAuthenticatedClient(entityId)
    return this.fetchWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/mailFolders/inbox/messageRules?$select=id,displayName`,
      token,
      async (data) =>
        (data.value || []).map((r: any) => ({ id: r.id, displayName: r.displayName }))
    )
  }

  async deleteMailRule(entityId: string, userId: string, ruleId: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.deleteWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/mailFolders/inbox/messageRules/${ruleId}`,
      token
    )
  }

  async convertToSharedMailbox(entityId: string, userId: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.patchWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}`,
      token,
      { mailboxSettings: { userPurpose: 'shared' } }
    )
  }

  async removeLicense(entityId: string, userId: string, skuId: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.postWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}/assignLicense`,
      token,
      { addLicenses: [], removeLicenses: [skuId] }
    )
  }

  async renameMailbox(entityId: string, userId: string, newUpn: string): Promise<void> {
    const { token } = await this.getAuthenticatedClient(entityId)
    await this.patchWithRetry(
      `${GRAPH_BASE_URL}/users/${userId}`,
      token,
      { userPrincipalName: newUpn }
    )
  }

  // ─── HTTP helpers ──────────────────────────────────────────────────────────

  private async patchWithRetry(url: string, token: string, body: any, attempt: number = 1): Promise<void> {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err: any) {
      throw new GraphTransientError(`Network error: ${err.message}`)
    }
    if (response.ok || response.status === 204) return
    await this.handleErrorResponse(response, url, attempt, () => this.patchWithRetry(url, token, body, attempt + 1))
  }

  private async postWithRetry(url: string, token: string, body: any, attempt: number = 1): Promise<any> {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err: any) {
      throw new GraphTransientError(`Network error: ${err.message}`)
    }
    if (response.ok || response.status === 204) {
      if (response.headers.get('content-type')?.includes('json')) {
        return response.json()
      }
      return
    }
    await this.handleErrorResponse(response, url, attempt, () => this.postWithRetry(url, token, body, attempt + 1))
  }

  private async deleteWithRetry(url: string, token: string, attempt: number = 1): Promise<void> {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err: any) {
      throw new GraphTransientError(`Network error: ${err.message}`)
    }
    if (response.ok || response.status === 204) return
    await this.handleErrorResponse(response, url, attempt, () => this.deleteWithRetry(url, token, attempt + 1))
  }

  private async handleErrorResponse(response: Response, url: string, attempt: number, retryFn: () => Promise<any>): Promise<never> {
    if (response.status === 401 || response.status === 403) {
      const body = await response.json().catch(() => ({}))
      throw new GraphAuthError(body.error?.message || `Graph API ${response.status}`)
    }
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        throw new GraphRateLimitError(`Rate limited after ${MAX_RETRY_ATTEMPTS} attempts`, retryAfter * 1000)
      }
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      return retryFn() as never
    }
    if (response.status >= 500) {
      throw new GraphTransientError(`Graph API server error: ${response.status}`)
    }
    const body = await response.json().catch(() => ({}))
    throw new GraphApiError(body.error?.message || `Unexpected response: ${response.status} at ${url}`)
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
