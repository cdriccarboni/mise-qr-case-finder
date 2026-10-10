import { test, expect } from '@playwright/test'
import { APP_VERSION } from '../../src/version.js'

test('PWA exposes a safe recovery path without touching local inventory', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText(APP_VERSION)
  await page.locator('#preferencesBtn').click()
  const recovery=page.locator('#pwaRecoveryLink')
  await expect(recovery).toHaveAttribute('href','https://cdriccarboni.github.io/mises-pwa-recovery/')
  await expect(page.locator('#preferencesDlg')).toContainText('sans effacer mes données')
  await expect(page.locator('#pwaRecoveryBanner')).toHaveCount(0)
})
