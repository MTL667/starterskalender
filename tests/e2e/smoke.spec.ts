import { test, expect } from '../support/fixtures/base.fixture'

test.describe('Smoke Tests — Critical Paths', () => {
  test('dashboard loads with navigation and stats', async ({ page, api }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(page).toHaveURL(/dashboard/)

    const { status } = await api.getKpiStats()
    expect(status).toBe(200)
  })

  test('starters list loads and API returns data', async ({ page, api }) => {
    await page.goto('/starters')
    await expect(page).toHaveURL(/starters/)
    await expect(page.getByRole('navigation')).toBeVisible()

    const { status, data } = await api.getStarters()
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  test('calendar page loads', async ({ page }) => {
    await page.goto('/kalender')
    await expect(page).toHaveURL(/kalender/)
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('tasks page loads and API returns data', async ({ page, api }) => {
    await page.goto('/taken')
    await expect(page).toHaveURL(/taken/)

    const { status, data } = await api.getTasks()
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  test('admin panel is accessible for admin user', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/admin/)
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('admin entities page loads', async ({ page, api }) => {
    await page.goto('/admin/entities')
    await expect(page).toHaveURL(/admin\/entities/)

    const { status, data } = await api.getEntities()
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  test('admin users page loads', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/admin\/users/)
  })

  test('profile/notification preferences page loads', async ({ page }) => {
    await page.goto('/profiel')
    await expect(page).toHaveURL(/profiel/)
  })
})

test.describe('API Smoke Tests — Auth & Permissions', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const freshContext = request
    const res = await freshContext.get('/api/starters', {
      headers: { cookie: '' },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('entities API returns valid structure', async ({ api }) => {
    const { status, data } = await api.getEntities()
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('name')
    }
  })

  test('starters API returns valid structure', async ({ api }) => {
    const { status, data } = await api.getStarters()
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('firstName')
      expect(data[0]).toHaveProperty('lastName')
      expect(data[0]).toHaveProperty('type')
    }
  })

  test('tasks API returns valid structure', async ({ api }) => {
    const { status, data } = await api.getTasks()
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('type')
      expect(data[0]).toHaveProperty('status')
    }
  })
})

test.describe('Public Pages', () => {
  test('sign-in page loads without auth', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/auth/signin')
    await expect(page).toHaveURL(/signin/)
    await context.close()
  })

  test('invalid signing token shows error', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/sign/invalid-token-xyz')
    await expect(page.getByText(/niet gevonden|not found|error/i)).toBeVisible({ timeout: 15_000 })
    await context.close()
  })
})
