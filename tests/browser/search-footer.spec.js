import { test, expect } from '@playwright/test'

test('search home stays compact and footer identifies the build', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.7')
  await expect(page.locator('#q')).toHaveAttribute('placeholder', /tonnerre/i)
  await expect(page.locator('#searchResults')).toBeEmpty()
  await expect(page.locator('#searchResults .empty')).toHaveCount(0)
  const footer = page.locator('.appFooter')
  await expect(footer).toBeVisible()
  await expect(footer).toContainText('MISES! · QR Case Finder')
  await expect(footer.locator('#footerVersion')).toHaveText('0.4.0-beta.7')
  await expect(footer).toContainText('© Cédric Carboni')
  await expect(footer).not.toContainText('Code & création')
})
