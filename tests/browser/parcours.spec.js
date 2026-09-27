import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { exportBinder } from '../../src/data-import.js'
import { fictionalData } from '../../scripts/fictional-data.mjs'

const shots = '/opt/cursor/artifacts/screenshots'

async function dotCenters(page) {
  return page.evaluate(() => [...document.querySelectorAll('header .miseWordmark .markDot')].map(el => {
    const box = el.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, w: box.width, h: box.height }
  }))
}

test('logo dots stay aligned and the fictional catalogue can be corrected offline', async ({ page, context }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await mkdir(shots, { recursive: true })
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0]
    return { domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd), loadMs: Math.round(entry.loadEventEnd) }
  })
  console.log(JSON.stringify({ navigation }))
  await expect(page.locator('#objectCards')).toContainText('Aucun objet')
  for (const width of [390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const dots = await dotCenters(page)
    expect(dots, `largeur ${width}`).toHaveLength(2)
    expect(dots[1].y - dots[0].y, `le point du ! est sous le point du i ${width}`).toBeGreaterThan(8)
    expect(Math.abs(dots[0].h - dots[1].h), `taille ${width}`).toBeLessThan(0.75)
    expect(dots[1].x - dots[0].x).toBeGreaterThan(20)
    await page.locator('header').screenshot({ path: `${shots}/logo-${width}.png` })
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByText('Partager & outils', { exact: true }).click()
  await page.locator('#goalDataBruitage').click()
  await page.locator('.dataDialog [data-files]').setInputFiles({
    name: 'classeur-fictif.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(exportBinder(fictionalData()))
  })
  await expect(page.locator('[data-apply]')).toBeVisible()
  await page.locator('[data-apply]').click()
  await expect(page.locator('.dataDialog [data-status]')).toContainText('Import terminé')
  await page.locator('[data-duplicates]').click()
  await expect(page.locator('[data-preview]')).toContainText('bouteille fictive')
  await page.locator('.dataDialog [data-files]').setInputFiles({ name: 'mauvais.json', mimeType: 'application/json', buffer: Buffer.from('{') })
  await expect(page.locator('.dataDialog [data-status]')).toContainText('erreur')
  await page.locator('[data-close]').click()
  await page.locator('#q').fill('glouglou fictif')
  await expect(page.locator('#searchResults')).toContainText('Bouteille fictive')
  await expect(page.locator('#searchResults')).toContainText('Entendre : glouglou fictif')
  await expect(page.locator('#searchResults')).toContainText('Imaginer : océan imaginé fictif')
  await page.locator('[data-open="obj-fictif-bouteille"]').click()
  await expect(page.locator('#fHear')).toHaveValue('glouglou fictif')
  await expect(page.locator('#fImagine')).toHaveValue('océan imaginé fictif')
  await page.locator('#fImagine').fill('tempête imaginée fictive')
  await page.locator('#saveObject').click()
  await expect(page.locator('#toast')).toHaveText('Objet enregistré')
  await page.reload()
  await page.locator('#q').fill('tempête imaginée fictive')
  await expect(page.locator('#searchResults')).toContainText('tempête imaginée fictive')
  await page.locator('[data-open="obj-fictif-bouteille"]').click()
  await expect(page.locator('#fHear')).toHaveValue('glouglou fictif')
  await expect(page.locator('#fImagine')).toHaveValue('tempête imaginée fictive')
  await page.locator('#modal').evaluate(dialog => dialog.close())
  await context.setOffline(true)
  await page.reload()
  await page.locator('#q').fill('tempête imaginée fictive')
  await expect(page.locator('#searchResults')).toContainText('Bouteille fictive')
  await expect(page.locator('#networkStatus')).toContainText('Hors ligne')
  expect(errors).toEqual([])
})

test('bad audio, refused microphone, container QR and unconfirmed photo stay explicit', async ({ page }) => {
  await page.addInitScript(() => {
    const denied = () => Promise.reject(Object.assign(new DOMException('Permission denied', 'NotAllowedError'), {}))
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: denied } })
  })
  await page.goto('/')
  await page.getByText('Ranger & préparer', { exact: true }).click()
  await page.locator('[data-tab="cases"]').click()
  await page.locator('#addCase').click()
  await page.locator('#cName').fill('Valise fictive parcours')
  await page.locator('#saveCase').click()
  await page.locator('[data-case]').first().click()
  await expect(page.locator('img.qr')).toBeVisible()
  expect(await page.locator('img.qr').getAttribute('src')).toMatch(/^data:image\/png/)
  await page.locator('#closeCase').click()
  await page.locator('[data-tab="inventory"]').click()
  await page.locator('#addObject').click()
  await page.locator('#fName').fill('Objet audio fictif')
  await page.locator('#fHear').fill('tic fictif')
  await page.locator('#fImagine').fill('tac imaginé fictif')
  await page.locator('#audioMemo').click()
  await expect(page.locator('#audioNote')).toContainText('Permission micro refusée')
  await page.locator('#saveObject').click()
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('mises-db')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('objects', 'readwrite')
      const store = tx.objectStore('objects')
      const get = store.getAll()
      get.onsuccess = () => {
        const row = get.result.find(item => item.name === 'Objet audio fictif')
        row.audioMemo = 'data:audio/webm;base64,AAAA'
        store.put(row)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
  }))
  await page.reload()
  await page.getByText('Ranger & préparer', { exact: true }).click()
  await page.locator('[data-tab="inventory"]').click()
  await page.getByRole('button', { name: /Objet audio fictif/ }).click()
  await expect(page.locator('#audioNote')).toContainText('absent ou illisible', { timeout: 5000 })
  await expect(page.locator('#fImagine')).toHaveValue('tac imaginé fictif')
  await page.locator('#modal').evaluate(dialog => dialog.close())
  await page.locator('#photoInput').setInputFiles({
    name: 'bruit.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 80
      canvas.height = 60
      const ctx = canvas.getContext('2d')
      for (let i = 0; i < 80; i++) for (let j = 0; j < 60; j++) { ctx.fillStyle = `rgb(${(i * 13) % 255},${(j * 29) % 255},40)`; ctx.fillRect(i, j, 1, 1) }
      return canvas.toDataURL('image/png').split(',')[1]
    }), 'base64')
  })
  const dialog = page.locator('.visionDialog')
  await expect(dialog).toBeVisible()
  await dialog.locator('[data-manual]').click()
  await dialog.locator('[data-save]').click()
  await expect(dialog.locator('[data-error]')).toContainText('Confirmez')
  await dialog.locator('[data-close]').click()
})
