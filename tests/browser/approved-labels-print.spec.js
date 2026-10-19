import { test, expect } from '@playwright/test'

test('ÉTIQUETTES : bitmap envoyé au pilote = aperçu (pixel à pixel) ; Archiver / Archivées / Restaurer / Supprimer', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => {
    window.__printed = []
    window.MisesAndroidPrinter = { listPairedPrinters: () => '[{"address":"AA:BB","name":"WalkPrint","likelyPrinter":true}]', printImages: (a, j) => { window.__printed.push(...JSON.parse(j)) } }
  })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Boolean(window.__mises_v2))).toBe(true)
  await page.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('mises-db'); r.onsuccess = () => { const t = r.result.transaction(['settings', 'cases'], 'readwrite'); t.objectStore('settings').put({ id: 'printer', name: 'WalkPrint', deviceId: 'AA:BB', native: true }); for (let k = 1; k <= 6; k++) t.objectStore('cases').put({ id: 'CASE-DEMO-0' + k, name: 'CONTENANT FICTIF ' + k, type: 'contenant', protected: k === 1, updatedAt: '2026-10-20T00:00:00Z' }); t.oncomplete = res; t.onerror = rej } }))
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(window.__mises_v2))).toBe(true)
  await page.locator('[data-testid="home-labels"]').click()
  await expect.poll(() => page.locator('[data-label-img]').evaluateAll(l => l.length === 6 && l.every(i => i.naturalWidth === 384))).toBe(true)
  await page.locator('#labelsAll').check()
  await page.locator('#printSelected').click()
  await expect.poll(() => page.evaluate(() => window.__printed.length)).toBe(6)
  const hashes = await page.evaluate(async () => {
    const sha = async src => { const img = new Image(); img.src = src; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; return [...new Uint8Array(await crypto.subtle.digest('SHA-256', d))].map(b => b.toString(16).padStart(2, '0')).join('') }
    const previews = {}; for (const i of document.querySelectorAll('[data-label-img]')) previews[i.dataset.labelImg] = await sha(i.src)
    return { previews, printed: await Promise.all(window.__printed.map(sha)) }
  })
  expect(Object.keys(hashes.previews)).toHaveLength(6)
  expect(hashes.printed.sort()).toEqual(Object.values(hashes.previews).sort())
  // Archiver : masquée, ID conservé ; Archivées → Restaurer
  await page.locator('[data-archive-one="CASE-DEMO-01"]').click()
  await expect(page.locator('[data-print-one]')).toHaveCount(5)
  await page.locator('#labelsView').click()
  await expect(page.locator('[data-restore-one="CASE-DEMO-01"]')).toBeVisible()
  await page.locator('[data-restore-one="CASE-DEMO-01"]').click()
  await page.locator('#labelsView').click()
  await expect(page.locator('[data-print-one]')).toHaveCount(6)
  // Supprimer : jamais pour un contenant protégé ; confirmation pour les autres
  await expect(page.locator('[data-delete-one="CASE-DEMO-01"]')).toHaveCount(0)
  page.once('dialog', d => d.accept())
  await page.locator('[data-delete-one="CASE-DEMO-02"]').click()
  await expect(page.locator('[data-print-one]')).toHaveCount(5)
  await ctx.close()
})
