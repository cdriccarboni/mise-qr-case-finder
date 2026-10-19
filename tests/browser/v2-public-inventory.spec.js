import { test, expect, devices } from '@playwright/test'
test.use({ ...devices['Pixel 7'], browserName: 'chromium' })

const PUBLIC = {
  cases: [{ id: 'case-sac-a', name: 'Sac fictif A', owner_id: 'u-secret' }, { id: 'case-poche', name: 'Poche avant', parentId: 'case-sac-a' }, { id: 'case-valise', name: 'Valise fictive' }],
  objects: [
    { id: 'o1', name: 'Câble XLR fictif 3 m', caseId: 'case-poche', quantity: 4, notes: 'NOTE-PRIVEE', email: 'prive@example.invalid' },
    { id: 'o2', name: 'Pied de micro fictif', caseId: 'case-sac-a', quantity: 2 },
    { id: 'o3', name: 'Tôle fictive à tonnerre', caseId: 'case-valise', quantity: 1, methods: [{ technique: 'Secouer la tôle' }] }
  ],
  sounds: [], objectSounds: [], members: [{ email: 'prive@example.invalid' }]
}

test('QR contenant -> page publique sans compte ; recherche globale ; écriture refusée ; champs privés absents', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'] }) // contexte neuf, non authentifié
  const page = await context.newPage()
  const writes = []
  await page.route('**/rest/v1/rpc/get_public_inventory', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PUBLIC) }))
  await page.route('**/rest/v1/mises_records**', route => { writes.push(route.request().method()); route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"new row violates row-level security policy"}' }) })

  await page.goto('/?case=case-sac-a')
  await expect(page.locator('[data-testid="pub-title"]')).toHaveText('Sac fictif A')
  const body = page.locator('[data-testid="pub-body"]')
  await expect(body).toContainText('Pied de micro fictif')
  await expect(body).toContainText('×2')
  await expect(page.locator('[data-testid="pub-sub"]')).toContainText('Poche avant')
  await expect(page.locator('[data-testid="pub-sub"]')).toContainText('Câble XLR fictif 3 m')
  await expect(body).toContainText('×4')
  await expect(page.locator('#publicInventory')).not.toContainText('NOTE-PRIVEE')
  await expect(page.locator('#publicInventory')).not.toContainText('prive@example.invalid')
  await expect(page.locator('#publicInventory button', { hasText: /Retirer|Modifier|Supprimer/ })).toHaveCount(0)

  await page.locator('#pubCaseSearch').fill('pied')
  await expect(body).toContainText('Pied de micro fictif')
  await expect(body).not.toContainText('Câble XLR')

  await page.locator('#pubGlobalSearch').fill('tôle')
  const hit = page.locator('.pubResult[data-kind="objet"]').first()
  await expect(hit).toContainText('Tôle fictive à tonnerre')
  await expect(hit).toContainText('Valise fictive')
  await hit.locator('[data-pub-case]').click()
  await expect(page.locator('[data-testid="pub-title"]')).toHaveText('Valise fictive')

  const status = await page.evaluate(async () => (await fetch('https://jemqozyqqsgabljnhfvn.supabase.co/rest/v1/mises_records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"record_id":"x"}' })).status)
  expect(status).toBe(401)
  expect(writes).toEqual(['POST'])
  await context.close()
})
