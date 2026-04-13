import { test, expect } from '@playwright/test'

test.describe('Public Signing Page', () => {
  test('should show 404 for invalid signing token', async ({ page }) => {
    // Given: a non-existent signing token
    await page.goto('/sign/invalid-token-123')

    // Then: an error state is displayed
    await expect(page.getByText(/niet gevonden|not found/i)).toBeVisible({ timeout: 10_000 })
  })
})
