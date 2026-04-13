import { test as setup, expect } from '@playwright/test'

const ADMIN_AUTH_FILE = 'tests/support/.auth/admin.json'

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/signin')

  const emailInput = page.getByPlaceholder('admin@test.local')
  await expect(emailInput).toBeVisible({ timeout: 10_000 })

  await emailInput.fill('admin@test.local')
  await page.getByRole('button', { name: /inloggen|sign in/i }).click()

  await page.waitForURL('/dashboard', { timeout: 30_000 })
  await expect(page.getByRole('navigation')).toBeVisible()

  await page.context().storageState({ path: ADMIN_AUTH_FILE })
})
