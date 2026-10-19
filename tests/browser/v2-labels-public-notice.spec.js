import { test, expect } from '@playwright/test'

const CSV = 'ID,Nom,Contenant,Nom contenant,Quantité\nSAC-FICTIF-01-001,Objet fictif A,SAC-FICTIF-01,SAC FICTIF — 1/2,1\nSAC-FICTIF-02-001,Objet fictif B,SAC-FICTIF-02,SAC FICTIF — 2/2,\n'

test('accueil mobile : ÉTIQUETTES ouvre Étiquettes · Mes contenants avec noms CSV, Tout sélectionner et IMPRIMER', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Boolean(window.__mises_v2))).toBe(true)
  await page.evaluate(() => window.__mises_v2.openCsvImport())
  await page.locator('[data-testid="csv-file"]').setInputFiles({ name: 'fictif.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) })
  await expect(page.locator('[data-testid="csv-summary"]')).toBeVisible()
  await page.locator('#csvApply').click()
  await expect(page.locator('[data-testid="csv-status"]')).toContainText('fiche(s) écrite(s)')
  await page.locator('#closeCsv').click()
  const btn = page.locator('[data-testid="home-labels"]')
  await expect(btn).toBeVisible()
  await expect(btn).toBeInViewport()
  await btn.click()
  const list = page.locator('[data-testid="labels-list"]')
  await expect(list).toContainText('SAC FICTIF — 1/2')
  await expect(list).toContainText('SAC FICTIF — 2/2')
  await expect(list).toContainText('SAC-FICTIF-01')
  await expect(page.locator('#labelsAll')).toBeVisible()
  await page.locator('#labelsAll').check()
  await expect(page.locator('[data-print-case]:checked')).toHaveCount(2)
  await expect(page.locator('#printSelected')).toHaveText('IMPRIMER LA SÉLECTION')
})

for (const [label, status, body, kind, title] of [
  ['RPC absente (migration non appliquée)', 404, '{"code":"PGRST202","message":"Could not find the function"}', 'not-published', 'Inventaire pas encore publié'],
  ['inventaire vide', 200, '{"cases":[],"objects":[],"sounds":[],"objectSounds":[]}', 'not-published', 'Inventaire pas encore publié'],
  ['contenant absent', 200, '{"cases":[{"id":"AUTRE-01","name":"Autre"}],"objects":[],"sounds":[],"objectSounds":[]}', 'case-missing', 'Contenant pas encore publié']
]) test(`QR public : message clair si ${label}`, async ({ page }) => {
  await page.route('**/rest/v1/rpc/get_public_inventory', route => route.fulfill({ status, contentType: 'application/json', body }))
  await page.goto('/?case=SAC-FICTIF-01')
  const notice = page.locator('[data-testid="pub-notice"]')
  await expect(notice).toBeVisible()
  await expect(notice).toHaveAttribute('data-kind', kind)
  await expect(notice).toContainText(title)
  await expect(notice).toContainText('SAC-FICTIF-01')
})

test('QR public : hors ligne → message + Réessayer', async ({ page }) => {
  await page.route('**/rest/v1/rpc/get_public_inventory', route => route.abort('internetdisconnected'))
  await page.goto('/?case=SAC-FICTIF-01')
  await expect(page.locator('[data-testid="pub-notice"]')).toHaveAttribute('data-kind', 'offline')
  await expect(page.locator('[data-pub-retry]')).toBeVisible()
})

test('sans compte ni import, puis hors ligne : ÉTIQUETTES ne montre aucun contenant intégré (liste vide)', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('/')
  await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker?.ready))).toBe(true)
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller))).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await page.locator('[data-testid="home-labels"]').click()
  const list = page.locator('[data-testid="labels-list"]')
  // Aucun contenant intégré : un nouvel utilisateur voit une liste vide et crée les siens.
  await expect(list).toContainText('Aucun contenant')
  await expect(page.locator('[data-print-one]')).toHaveCount(0)
  await context.close()
})
