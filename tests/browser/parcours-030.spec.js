import { APP_VERSION } from '../../src/version.js'
import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const shots = new URL('../../test-results/screenshots', import.meta.url).pathname

test('parcours terrain 0.3.0 : caisse, QR, photo, vibe, exercice, correction, hors ligne', async ({ page, context }) => {
  test.setTimeout(180000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    window.__prints = []
    window.MisesAndroidPrinter = {
      listPairedPrinters: () => '[]',
      printImages: () => {},
      openBluetoothSettings: () => {},
      printWithSystem: (name, dataUrl) => { window.__prints.push({ name, dataUrl }) }
    }
  })
  await mkdir(shots, { recursive: true })
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await expect(page.locator('#appVersion')).toHaveText(APP_VERSION)
  await expect(page.locator('#projectContext')).toBeHidden()
  await expect(page.locator('#aboutHome')).toHaveCount(0)
  await expect(page.locator('#goalAbout')).toHaveCount(0)
  await expect(page.locator('#preferencesAbout')).toHaveCount(0)
  await page.locator('#preferencesBtn').click()
  const preferences = page.locator('#preferencesDlg')
  await expect(preferences).toBeVisible()
  await page.locator('#preferencesShare').click()
  await expect(preferences).toBeHidden()
  const appShare = page.locator('#modal')
  await expect(appShare).toBeVisible()
  await expect(appShare).toContainText('Partager MISES!')
  await expect(appShare.locator('img.shareAppQr')).toHaveAttribute('src', /^data:image\/png/)
  await expect(appShare.locator('.shareAppUrl')).toContainText('https://cdriccarboni.github.io/mise-qr-case-finder/')
  await page.locator('#closeAppShare').click()
  await expect(appShare).toBeHidden()
  await page.locator('#preferencesBtn').click()
  await expect(preferences).toBeVisible()
  expect(await page.evaluate(() => window.__mise.handleBack())).toBe(true)
  await expect(preferences).toBeHidden()

  await page.locator('#manualBtn').click()
  await expect(page.locator('#manualDlg')).toBeVisible()
  await page.mouse.click(4, 4)
  await expect(page.locator('#manualDlg')).toBeHidden()

  await page.getByText('Ranger', { exact: true }).click()
  await page.locator('[data-tab="cases"]').click()
  await page.locator('#addCase').click()
  await page.locator('#cName').fill('Caisse grise n°23')
  await page.locator('#cType').selectOption('Caisse')
  await page.locator('#saveCase').click()
  await page.getByRole('button', { name: /Caisse grise n°23/ }).click()
  await expect(page.locator('img.qr')).toBeVisible()
  const qrSrc = await page.locator('img.qr').getAttribute('src')
  expect(qrSrc).toMatch(/^data:image\/png/)
  await page.locator('#printLabel').click()
  const jobPng = await page.locator('#printDlg .labelPreview img').getAttribute('src')
  expect(jobPng).toMatch(/^data:image\/png/)
  await expect(page.locator('#systemPrint')).toHaveCount(0)
  await page.locator('#btPrint').click()
  await expect(page.locator('#printerDlg')).toContainText('Mini-imprimante · Android')
  expect(await page.evaluate(() => window.__prints.length)).toBe(0) // never open Epson
  await page.locator('#closeNativePrinter').click()
  await page.locator('#closePrint').click()
  await page.locator('#closeCase').click()
  await page.evaluate(async (src) => window.__mise.ingestQrImage(src), jobPng)
  await expect(page.locator('.caseView')).toContainText('Caisse grise n°23')
  await page.locator('#closeCase').click()

  await page.evaluate(() => {
    window.__MISES_DETECTIONS = [
      { class: 'bottle', score: 0.92, bbox: [12, 18, 90, 110] },
      { class: 'cup', score: 0.84, bbox: [120, 20, 70, 80] },
      { class: 'spoon', score: 0.8, bbox: [210, 30, 50, 40] },
      { class: 'person', score: 0.99, bbox: [0, 0, 30, 200] }
    ]
  })
  const image = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f4efe8'
    ctx.fillRect(0, 0, 320, 240)
    ctx.fillStyle = '#245c4a'
    ctx.fillRect(20, 30, 80, 120)
    ctx.fillStyle = '#c9843a'
    ctx.fillRect(130, 40, 60, 70)
    ctx.fillStyle = '#888'
    ctx.fillRect(220, 50, 40, 20)
    return canvas.toDataURL('image/png').split(',')[1]
  }), 'base64')
  await page.locator('#groupPhotoInput').setInputFiles({ name: 'groupe.png', mimeType: 'image/png', buffer: image })
  const dialog = page.locator('.visionDialog[open]')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-status]')).toContainText('3 zone(s) proposée(s)', { timeout: 20000 })
  await expect(dialog.locator('[data-row]')).toHaveCount(3)
  await dialog.locator('[data-batch-case]').selectOption({ label: 'Caisse grise n°23' })
  await dialog.locator('[data-batch-all]').click()
  await expect(dialog).toHaveCount(0)
  await page.reload()
  await page.getByText('Ranger', { exact: true }).click()
  await page.locator('[data-tab="inventory"]').click()
  await expect(page.locator('#objectCards')).toContainText('bouteille')
  await expect(page.locator('#objectCards')).toContainText('tasse')
  await expect(page.locator('#objectCards')).toContainText('cuillère')
  await page.getByRole('button', { name: /bouteille/ }).click()
  await page.locator('#fName').fill('Chaîne moyenne')
  await page.locator('#fHear').fill('cliquetis de chaîne')
  await page.locator('#fImagine').fill('gréement imaginé')
  await page.locator('#saveObject').click()
  await expect(page.locator('#toast')).toHaveText('Objet enregistré')
  await expect(page.locator('#modal')).toBeHidden()
  await page.locator('#q').click()
  await page.locator('#q').fill('Chaîne moyenne')
  await page.locator('#q').press('Enter')
  await expect(page.locator('#searchResults')).toContainText('Chaîne moyenne')
  await expect(page.locator('#searchResults')).toContainText('Caisse grise n°23')
  await page.locator('#q').fill('cliquetis de chaîne')
  await expect(page.locator('#searchResults')).toContainText('Chaîne moyenne')
  await page.locator('#q').fill('Une forêt inquiétante la nuit avec quelque chose qui rôde au loin')
  await expect(page.locator('[data-assistant]')).toContainText('Chaîne moyenne')
  await expect(page.locator('[data-assistant]')).toContainText('Caisse grise n°23')
  await expect(page.locator('[data-assistant]')).toContainText('Dans ta base')
  await page.locator('[data-tab="vibe"]').click()
  await page.locator('#vibePrompt').fill('Une forêt inquiétante la nuit avec quelque chose qui rôde au loin')
  await page.locator('#runVibe').click()
  await expect(page.locator('#vibeOut')).toContainText('Chaîne moyenne — Caisse grise n°23')
  await expect(page.locator('#vibeOut')).toContainText('Bibliothèque publique de techniques')
  await page.getByText('Créer', { exact: true }).click()
  await page.locator('#goalExercise').click()
  await page.locator('#runExercise').click()
  await expect(page.locator('#exerciseOut')).toContainText('Proposition générée')
  await expect(page.locator('#exerciseOut')).toContainText('Chaîne moyenne')

  await page.evaluate(() => {
    window.__MISES_DETECTIONS = [
      { class: 'wine glass', score: 0.9, bbox: [20, 20, 70, 90] },
      { class: 'spoon', score: 0.86, bbox: [140, 30, 40, 70] },
      { class: 'person', score: 0.95, bbox: [240, 10, 40, 180] }
    ]
  })
  await page.locator('#handsPhotoInput').setInputFiles({ name: 'mains.png', mimeType: 'image/png', buffer: image })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-creative]')).toContainText(/verre/i)
  await expect(dialog.locator('[data-creative]')).toContainText(/cuillère/i)
  await expect(dialog.locator('[data-creative]')).toContainText(/Tempête miniature|Cuisine inquiétante|créature|Même objet|Entrée en scène|Machine capricieuse/)
  await expect(dialog.locator('[data-creative]')).not.toContainText('violon')
  await dialog.locator('[data-close]').click()

  await page.evaluate(() => {
    window.__MISES_DETECTIONS = [{ class: 'chair', score: 0.93, bbox: [30, 20, 100, 120] }]
  })
  await page.locator('#photoInput').setInputFiles({ name: 'chaise.png', mimeType: 'image/png', buffer: image })
  await expect(dialog).toBeVisible()
  const row = dialog.locator('[data-row]').first()
  await row.locator('[data-name]').fill('Chaise froissable fictive')
  await row.locator('[data-learn]').check()
  await row.locator('[data-confirm]').check()
  await dialog.locator('[data-save]').click()
  await expect(dialog).toHaveCount(0)
  await page.locator('#photoInput').setInputFiles({ name: 'chaise-2.png', mimeType: 'image/png', buffer: image })
  await expect(dialog.locator('[data-name]')).toHaveValue('Chaise froissable fictive')
  await expect(dialog).toContainText('Correction humaine mémorisée')
  await dialog.locator('[data-close]').click()

  await page.setViewportSize({ width: 390, height: 844 })
  for (const theme of ['dark', 'light', 'regie']) {
    await page.evaluate(value => localStorage.setItem('mises-theme-mode', value), theme)
    await page.reload()
    await page.screenshot({ path: `${shots}/accueil-${theme}.png`, fullPage: false })
    await page.locator('#preferencesBtn').click()
    await page.locator('#preferencesShare').click()
    await expect(page.locator('#modal')).toBeVisible()
    await page.screenshot({ path: `${shots}/partage-${theme}.png`, fullPage: false })
    await page.locator('#closeAppShare').click()
    await expect(page.locator('#modal')).toBeHidden()
    await expect(page.locator('#preferencesDlg')).toBeHidden()
    await page.locator('[data-tab="vibe"]').click()
    await page.locator('#vibePrompt').fill('Une forêt inquiétante la nuit avec quelque chose qui rôde au loin')
    await page.locator('#runVibe').click()
    await expect(page.locator('#vibeOut')).toContainText('Chaîne moyenne')
    await page.screenshot({ path: `${shots}/vibe-${theme}.png`, fullPage: false })
  }

  const downloadPromise = page.waitForEvent('download')
  await page.getByLabel('Navigation MISES').getByText('Partager', { exact: true }).click()
  await page.locator('#goalBackup').click()
  const backup = await (await downloadPromise).path()
  await page.evaluate(() => indexedDB.deleteDatabase('mises-db'))
  await page.reload()
  page.once('dialog', dialogBox => dialogBox.accept())
  await page.locator('#restoreInput').setInputFiles(backup)
  await expect(page.locator('#toast')).toContainText('Sauvegarde importée :')
  await page.locator('#q').fill('Chaîne moyenne')
  await expect(page.locator('#searchResults')).toContainText('Caisse grise n°23')

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('#networkStatus')).toContainText('Hors ligne')
  await page.locator('#q').fill('Chaîne moyenne')
  await expect(page.locator('#searchResults')).toContainText('Caisse grise n°23')
  await page.locator('#q').fill('Où est mon truc pour faire le tonnerre ?')
  await expect(page.locator('[data-assistant]')).toBeVisible()
  expect(errors).toEqual([])
})
