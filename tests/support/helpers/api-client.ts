import { APIRequestContext } from '@playwright/test'

/**
 * Typed API helper for Playwright E2E tests.
 * Uses the authenticated request context from Playwright fixtures.
 */
export class ApiClient {
  constructor(private request: APIRequestContext) {}

  async getStarters() {
    const res = await this.request.get('/api/starters')
    return { status: res.status(), data: await res.json() }
  }

  async getStarter(id: string) {
    const res = await this.request.get(`/api/starters/${id}`)
    return { status: res.status(), data: await res.json() }
  }

  async getDocuments(starterId: string) {
    const res = await this.request.get(`/api/starters/${starterId}/documents`)
    return { status: res.status(), data: await res.json() }
  }

  async getTasks() {
    const res = await this.request.get('/api/tasks')
    return { status: res.status(), data: await res.json() }
  }

  async getEntities() {
    const res = await this.request.get('/api/entities')
    return { status: res.status(), data: await res.json() }
  }

  async getKpiStats() {
    const res = await this.request.get('/api/stats/kpi')
    return { status: res.status(), data: await res.json() }
  }
}
