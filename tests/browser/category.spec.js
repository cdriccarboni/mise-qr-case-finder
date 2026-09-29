import { test, expect } from '@playwright/test'

test('one gesture replaces the water-bottle category with the fiche and remembers it', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.2')
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mises-db')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction('objects', 'readwrite')
      tx.objectStore('objects').put({
        id: 'obj-frappee', name: 'Bouteille frappée', aliases: [], tags: [], sounds: [], contexts: [],
        owned: true, hear: 'glouglou', imagine: '', family: 'À classer', caseId: ''
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  })
  await page.reload()
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.2')
  const image = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 80
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f4efe8'
    ctx.fillRect(0, 0, 80, 80)
    return canvas.toDataURL('image/png').split(',')[1]
  }), 'base64')
  await page.evaluate(() => {
    window.__MISES_DETECTIONS = [{ class: 'bottle', score: 0.93, bbox: [8, 8, 40, 60] }]
  })
  await page.locator('#inventoryInput').setInputFiles({ name: 'bouteille.png', mimeType: 'image/png', buffer: image })
  const dialog = page.locator('.visionDialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-status]')).toContainText('1 objet(s) proposés', { timeout: 20000 })
  await expect(dialog).toContainText("bouteille d'eau")
  await expect(dialog.locator('[data-name]')).toHaveValue("bouteille d'eau")
  await dialog.getByRole('button', { name: 'Bouteille frappée' }).click()
  await expect(dialog.locator('[data-name]')).toHaveValue('Bouteille frappée')
  await expect(dialog.locator('[data-learn]')).toBeChecked()
  await dialog.locator('[data-close]').click()
  await expect(dialog).toHaveCount(0)

  await page.evaluate(() => {
    window.__MISES_DETECTIONS = [{ class: 'bottle', score: 0.9, bbox: [8, 8, 40, 60] }]
  })
  await page.locator('#inventoryInput').setInputFiles({ name: 'bouteille-2.png', mimeType: 'image/png', buffer: image })
  const again = page.locator('.visionDialog')
  await expect(again.locator('[data-status]')).toContainText('1 objet(s) proposés', { timeout: 20000 })
  await expect(again).toContainText("Catégorie : bouteille d'eau")
  await expect(again.locator('[data-name]')).toHaveValue('Bouteille frappée')
  await expect(again.locator('[data-picks] button').first()).toHaveText('Bouteille frappée')
  await again.locator('[data-close]').click()
})
