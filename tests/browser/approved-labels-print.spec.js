import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const APPROVED = Object.fromEntries([...readFileSync(new URL('../approved-labels.test.mjs', import.meta.url), 'utf8').matchAll(/'([A-Z0-9-]+)': \[(\d+), (\d+), '([0-9a-f]{64})'\]/g)].map(m => [m[1], m[4]]))

test('ÉTIQUETTES : aperçu ET bitmap envoyé au pilote WalkPrint/YHK = étiquettes approuvées (pixel à pixel)', async ({ browser }) => {
  expect(Object.keys(APPROVED)).toHaveLength(6)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => {
    window.__printed = []
    window.MisesAndroidPrinter = { listPairedPrinters: () => '[{"address":"AA:BB","name":"WalkPrint","likelyPrinter":true}]', printImages: (a, j) => { window.__printed.push(...JSON.parse(j)) } }
  })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Boolean(window.__mises_v2))).toBe(true)
  await page.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('mises-db'); r.onsuccess = () => { const t = r.result.transaction('settings', 'readwrite'); t.objectStore('settings').put({ id: 'printer', name: 'WalkPrint', deviceId: 'AA:BB', native: true }); t.oncomplete = res; t.onerror = rej } }))
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
  expect(hashes.previews).toEqual(APPROVED)
  expect(hashes.printed.sort()).toEqual(Object.values(APPROVED).sort())
  await ctx.close()
})
