import { test, expect } from '@playwright/test'

test('the screen says MISES ! and the wordmark is mises !', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('MISES ! — QR Case Finder')
  await expect(page.locator('header .miseWordmark')).toHaveAttribute('aria-label', 'mises !')
  await expect(page.locator('header')).toContainText('Cherche tes mises')
  const dots = await page.locator('header .miseWordmark .markDot').count()
  expect(dots).toBe(2)
  await page.locator('#aboutHome').click()
  await expect(page.locator('#aboutDlg')).toContainText('MISES ! — Une création de Cédric Carboni pour Acousmatic Theatre')
  await expect(page.locator('#aboutDlg .miseWordmark')).toHaveAttribute('aria-label', 'mises !')
})
