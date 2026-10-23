import { test, expect } from '@playwright/test'
import { decodeQrImage } from '../decode-qr.mjs'

const OBJ = { id: 'obj-link-demo', name: 'Raspberry Pi Looper', url: 'http://raspberrypi.local:8080/', family: 'Technique audio', owned: true, status: 'available', sounds: [], tags: [], contexts: [], caseId: '', updatedAt: '2026-10-22T00:00:00Z' }

async function pixels(page, src) {
  return page.evaluate(async src => { const img = new Image(); img.src = src; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0); return { width: c.width, height: c.height, rgba: [...x.getImageData(0, 0, c.width, c.height).data] } }, src)
}

test('étiquette objet avec lien : QR du lien par défaut, QR de la fiche au choix', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { window.__printed = []; window.MisesAndroidPrinter = { listPairedPrinters: () => '[{"address":"AA:BB","name":"WalkPrint","likelyPrinter":true}]', printImages: (a, j) => { window.__printed.push(...JSON.parse(j)) } } })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Boolean(window.__mises_v2))).toBe(true)
  await page.evaluate(o => new Promise((res, rej) => { const r = indexedDB.open('mises-db'); r.onsuccess = () => { const t = r.result.transaction(['settings', 'objects'], 'readwrite'); t.objectStore('settings').put({ id: 'printer', name: 'WalkPrint', deviceId: 'AA:BB', native: true }); t.objectStore('objects').put(o); t.oncomplete = res; t.onerror = rej } }), OBJ)
  await page.goto('/?object=' + OBJ.id)
  await expect(page.locator('#fUrl')).toHaveValue(OBJ.url)
  await expect(page.locator(`a[href="${OBJ.url}"]`)).toHaveAttribute('target', '_blank')
  // Bouton « QR objet »
  await page.locator('#qrObject').click()
  await expect(page.locator('#printDlg input[data-qr-choice][value="link"]')).toBeChecked()
  let img = await page.locator('#printDlg .labelPreview img').getAttribute('src')
  expect(decodeQrImage(await pixels(page, img))).toBe(OBJ.url)
  await page.locator('#btPrint').click()
  await expect.poll(() => page.evaluate(() => window.__printed.length)).toBe(1)
  expect(decodeQrImage(await pixels(page, await page.evaluate(() => window.__printed[0])))).toBe(OBJ.url)
  await page.locator('#printDlg input[data-qr-choice][value="record"]').check()
  img = await page.locator('#printDlg .labelPreview img').getAttribute('src')
  expect(decodeQrImage(await pixels(page, img))).toMatch(/\?object=obj-link-demo$/)
  await ctx.close()
})

test('« Créer une étiquette » : choix QR du lien par défaut, QR imprimé = URL externe', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { window.__printed = []; window.MisesAndroidPrinter = { listPairedPrinters: () => '[{"address":"AA:BB","name":"WalkPrint","likelyPrinter":true}]', printImages: (a, j) => { window.__printed.push(...JSON.parse(j)) } } })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Boolean(window.__mises_v2))).toBe(true)
  await page.evaluate(o => new Promise((res, rej) => { const r = indexedDB.open('mises-db'); r.onsuccess = () => { const t = r.result.transaction(['settings', 'objects'], 'readwrite'); t.objectStore('settings').put({ id: 'printer', name: 'WalkPrint', deviceId: 'AA:BB', native: true }); t.objectStore('objects').put(o); t.oncomplete = res; t.onerror = rej } }), OBJ)
  await page.goto('/?object=' + OBJ.id)
  await page.locator('#freeLabelObject').click()
  const ed = page.locator('dialog.labelEditorDialog')
  await expect(ed.locator('input[data-qr-choice][value="link"]')).toBeChecked()
  await ed.locator('[data-print]').click()
  await expect.poll(() => page.evaluate(() => window.__printed.length)).toBe(1)
  expect(decodeQrImage(await pixels(page, await page.evaluate(() => window.__printed[0])))).toBe(OBJ.url)
  await ctx.close()
})
