import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const backup = JSON.parse(readFileSync(new URL('../fixtures/beta2-backup.json', import.meta.url), 'utf8'))

test('the new app reimports a complete beta.2 backup file', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.4')
  page.once('dialog', dialog => dialog.accept())
  await page.locator('#restoreInput').setInputFiles({
    name: 'MISE-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  })
  await expect(page.locator('#toast')).toHaveText('Sauvegarde importée')
  await page.reload()
  await page.locator('#q').fill('Gourde froissable')
  await expect(page.locator('#searchResults')).toContainText('Gourde froissable')
  await expect(page.locator('#searchResults')).toContainText('Caisse grise n°23')
  await page.locator('[data-open="obj-beta2"]').click()
  await expect(page.locator('#fHear')).toHaveValue('glouglou')
  await expect(page.locator('#fImagine')).toHaveValue('cascade fictive')
  const stored = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mises-db')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
    const names = ['objects', 'sounds', 'objectSounds', 'aliases', 'mises', 'cases', 'sources', 'review', 'corrections', 'kits', 'learnings']
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction(names)
      const out = {}
      tx.oncomplete = () => resolve(out)
      tx.onerror = () => reject(tx.error)
      for (const name of names) {
        const request = tx.objectStore(name).getAll()
        request.onsuccess = () => { out[name] = request.result }
      }
    })
    db.close()
    const legacy = await indexedDB.databases()
    return { rows, legacy: legacy.map(item => item.name) }
  })
  const object = stored.rows.objects.find(item => item.id === 'obj-beta2')
  expect(object.photo).toBe(backup.objects[0].photo)
  expect(object.audioMemo).toBe(backup.objects[0].audioMemo)
  expect(stored.rows.mises.find(item => item.id === 'mise-beta2').checked).toEqual(['obj-beta2'])
  expect(stored.rows.kits.find(item => item.id === 'kit-beta2').name).toBe('Kit tournée')
  expect(stored.rows.learnings.find(item => item.id === 'learn-beta2').active).toBe(true)
  expect(stored.rows.corrections.find(item => item.id === 'corr-beta2').objectId).toBe('obj-beta2')
  expect(stored.rows.sounds.find(item => item.id === 'sound-beta2').name).toBe('Glouglou enregistré')
  expect(stored.legacy.includes('mise-db')).toBe(false)
})
