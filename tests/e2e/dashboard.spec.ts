import { test, expect } from '../support/fixtures/base.fixture'

test.describe('Dashboard', () => {
  test('should display the main dashboard after login', async ({ page }) => {
    // Given: an authenticated admin user
    await page.goto('/dashboard')

    // Then: the dashboard page loads with key elements
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('should show KPI stats via API', async ({ api }) => {
    // When: fetching KPI statistics
    const { status, data } = await api.getKpiStats()

    // Then: the API returns successfully
    expect(status).toBe(200)
    expect(data).toBeDefined()
  })

  test('should list entities', async ({ api }) => {
    // When: fetching entities
    const { status, data } = await api.getEntities()

    // Then: entities are returned
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })
})
