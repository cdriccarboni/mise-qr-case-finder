import { test, expect } from '@playwright/test'

test('photo picker offers album/file providers and accepts multiple images without forced camera', async ({page}) => {
  await page.goto('/')
  await page.locator('[data-action="photo"]').click()
  await expect(page.locator('#modal')).toContainText('Google Photos')
  await expect(page.locator('#modal')).toContainText('Drive')
  await expect(page.locator('#galleryInput')).toHaveAttribute('multiple', '')
  await expect(page.locator('#galleryInput')).not.toHaveAttribute('capture', /.+/)
  await expect(page.locator('#cameraInput')).toHaveAttribute('capture','environment')
  await page.locator('#closePhotoChoices').click()
})

test('voice label no longer prints dimensions; QR enlarged and SPARE reflects ink selection', async ({page}) => {
  await page.goto('/')
  await page.locator('[data-action="voice-label"]').click()
  const dialog=page.locator('.voiceLabelContainer')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-format-select]')).toHaveCount(0)
  await dialog.locator('[data-text-input]').fill('MICRO BRUITAGE\nSPARE')
  await dialog.locator('[data-spare-toggle]').check()
  await expect(dialog.locator('.spareBadge').first()).toBeVisible()
  await expect(dialog.locator('.voiceLabelDim')).toHaveCount(0)
  await expect(dialog.locator('.voiceLabelQrImg')).toBeVisible()
  const qrWidth=await dialog.locator('.voiceLabelQrImg').evaluate(img=>img.getBoundingClientRect().width)
  expect(qrWidth).toBeGreaterThan(90)
  await dialog.locator('[data-close]').first().click()
})

test('Mac mini-printer download is public, universal, and not tied to one computer', async ({page}) => {
  await page.goto('/')
  await page.locator('#goalPrinter').evaluate(button=>button.click())
  await expect(page.locator('#printerDlg')).toBeVisible()
  const url=await page.locator('#macCompanionDownload').getAttribute('href')
  expect(url).toBe('https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.4.0-beta.18/MISES-Mini-Printer-Mac-Universal.zip')
  await expect(page.locator('#printerDlg')).toContainText('M1 / M4 / Intel')
  await expect(page.locator('#printerDlg')).toContainText('chaque Mac')
})
