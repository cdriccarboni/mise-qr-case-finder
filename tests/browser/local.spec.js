import { test, expect } from '@playwright/test'
import { exportWorkbook } from '../../src/data-import.js'
import { emptyData } from '../../src/data-bruitage.js'
import { syntheticDocx, syntheticPdf } from '../synthetic-documents.mjs'

async function openCatalogue(page) {
  await page.getByText('Partager & outils', { exact: true }).click()
  await page.locator('#goalDataBruitage').click()
  await expect(page.locator('.dataDialog')).toBeVisible()
}
async function upload(page, files) {
  await page.locator('.dataDialog [data-files]').setInputFiles(files)
  await expect(page.locator('[data-apply]')).toBeVisible()
  await page.locator('[data-apply]').click()
  await expect(page.locator('.dataDialog [data-status]')).toContainText('Import terminé')
}
test('synthetic XLSX, PDF, DOCX imports and review work offline; export can be reimported', async ({ page, context }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await openCatalogue(page)
  const data = emptyData(); data.objects.push({ id: 'synthetic-object', name: 'Bouteille synthétique', sounds: ['Pluie synthétique'], tags: [], contexts: [] })
  await upload(page, [
    { name: 'synthetic.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(exportWorkbook(data)) },
    { name: 'synthetic.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: syntheticDocx() },
    { name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: syntheticPdf() }
  ])
  await expect(page.locator('[data-rows]')).toContainText('Bouteille synthétique')
  await page.locator('[data-table]').selectOption('review')
  await expect(page.locator('[data-rows]')).toContainText('Document DOCX synthetique')
  await expect(page.locator('[data-rows]')).toContainText('Document PDF synthetique')
  await page.locator('[data-edit]').first().click()
  await page.locator('[data-json]').fill(JSON.stringify({ id: 'reviewed-synthetic', name: 'Objet qualifié synthétique' }))
  await page.locator('[data-editor] [data-save]').click()
  await expect(page.locator('[data-status]')).toHaveText('Version humaine enregistrée.')
  const downloadPromise = page.waitForEvent('download'); await page.locator('[data-export]').click()
  const download = await downloadPromise, path = await download.path()
  const { readFile } = await import('node:fs/promises')
  await page.locator('[data-files]').setInputFiles({ name: 'synthetic-roundtrip.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: await readFile(path) })
  await expect(page.locator('[data-status]')).toContainText('0 ajout(s)')
  expect(errors).toEqual([])
})

test('actual bundled COCO model loads offline and manual photo correction survives reload', async ({ page, context }) => {
  const requests = []; page.on('request', request => requests.push(request.url()))
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true); await page.reload()
  const image = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const ctx = c.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 320, 240); return c.toDataURL('image/png').split(',')[1] })
  await page.locator('#photoInput').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  const dialog = page.locator('.visionDialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-status]')).toHaveText(/Aucun objet détecté|objet\(s\) proposés localement/, { timeout: 60000 })
  await dialog.locator('[data-manual]').click()
  const row = dialog.locator('[data-row]').last()
  await row.locator('[data-name]').fill('Objet photo synthétique')
  await row.locator('[data-confirm]').check()
  await dialog.locator('[data-save]').click()
  await expect(dialog).toHaveCount(0)
  await page.reload()
  await page.getByText('Ranger & préparer', { exact: true }).click()
  await page.locator('[data-tab="inventory"]').click()
  await expect(page.locator('#objectCards')).toContainText('Objet photo synthétique')
  expect(requests.some(url => url.includes('/api/staging-analyse'))).toBe(false)
  expect(requests.every(url => url.startsWith('http://127.0.0.1:4173/') || url.startsWith('data:') || url.startsWith('blob:'))).toBe(true)
  expect(errors).toEqual([])
})
