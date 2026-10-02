import { test, expect } from '@playwright/test'

test('the screen says MISES! and Preferences exposes Share instead of About', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('MISES! — QR Case Finder')
  await expect(page.locator('header .miseWordmark')).toHaveAttribute('aria-label', 'mises !')
  await expect(page.locator('header')).toContainText('Cherche ta mise')
  const dots = await page.locator('header .miseWordmark .markDot').count()
  expect(dots).toBe(2)
  await page.locator('#preferencesBtn').click()
  await expect(page.locator('#preferencesAbout')).toHaveCount(0)
  await page.locator('#preferencesShare').click()
  const share = page.locator('#modal')
  await expect(share).toBeVisible()
  await expect(share).toContainText('Partager MISES!')
  await expect(share.locator('img.shareAppQr')).toHaveAttribute('src', /^data:image\/png/)
  await page.locator('#closeAppShare').click()
  await expect(share).toBeHidden()
})
