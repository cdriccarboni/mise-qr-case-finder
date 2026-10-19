import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
const CSV = fileURLToPath(new URL('../fixtures/inventaire-fictif-v2.csv', import.meta.url))

async function importCsv(page) {
  await page.evaluate(() => window.__mises_v2.openCsvImport())
  await page.locator('[data-testid="csv-file"]').setInputFiles(CSV)
  await expect(page.locator('[data-testid="csv-summary"]')).toBeVisible()
}

test('import CSV deux fois : aucun doublon ; recherche trouve objet + contenant', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Boolean(window.__mises_v2))).toBe(true)
  await importCsv(page)
  await expect(page.locator('[data-create]')).toHaveAttribute('data-create', '3')
  const download = page.waitForEvent('download')
  await page.locator('#csvApply').click()
  expect((await download).suggestedFilename()).toMatch(/backup-avant-import/)
  await expect(page.locator('[data-testid="csv-status"]')).toContainText('3 fiche(s) écrite(s)')
  await page.locator('#closeCsv').click()

  await importCsv(page)
  await expect(page.locator('[data-create]')).toHaveAttribute('data-create', '0')
  await expect(page.locator('[data-unchanged]')).toHaveAttribute('data-unchanged', '3')
  await expect(page.locator('#csvApply')).toBeDisabled()
  await page.locator('#closeCsv').click()

  const count = await page.evaluate(async () => {
    const req = indexedDB.open('mises-db')
    const db = await new Promise(r => { req.onsuccess = () => r(req.result) })
    return await new Promise(r => { const g = db.transaction('objects').objectStore('objects').getAll(); g.onsuccess = () => r(g.result.filter(o => o.importSource).length) })
  })
  expect(count).toBe(3)

  await page.locator('#q').fill('tôle fictive')
  const hit = page.locator('.centralResult[data-kind="objet"]').first()
  await expect(hit).toContainText('Tôle fictive à tonnerre')
  await expect(hit).toContainText('Valise fictive')
  await expect(hit).toContainText('Tiroir 1')
  await page.locator('#q').fill('poche avant')
  await expect(page.locator('.centralResult[data-kind="contenant"]').first()).toContainText('Poche avant')
})

test('Étiquettes · Mes contenants : aperçu 384 pts pour chaque contenant', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Boolean(window.__mises_v2))).toBe(true)
  await importCsv(page)
  await page.locator('#csvApply').click()
  await expect(page.locator('[data-testid="csv-status"]')).toContainText('fiche(s) écrite(s)')
  await page.locator('#closeCsv').click()
  await page.evaluate(() => document.querySelector('#goalBatchPrint').click())
  const imgs = page.locator('[data-label-img]')
  await expect(imgs).toHaveCount(4 + 6) // 4 importés + 6 contenants intégrés
  await expect.poll(() => imgs.evaluateAll(list => list.every(i => i.naturalWidth === 384 && i.naturalHeight > 340))).toBe(true)
  await expect(page.locator('[data-print-one]')).toHaveCount(10)
  await expect(page.locator('#printSelected')).toBeVisible()
})
