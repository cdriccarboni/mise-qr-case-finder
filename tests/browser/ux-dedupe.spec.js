import { test, expect } from '@playwright/test'

async function seedCase(page) {
  await page.evaluate(async () => {
    const req = indexedDB.open('mise-db')
    await new Promise((resolve, reject) => { req.onerror = () => reject(req.error); req.onsuccess = () => resolve() })
  }).catch(() => {})
}

test('un seul champ recherche, pas de cartouches Recherche/Rechercher redondants', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await expect(page.locator('#q')).toHaveCount(1)
  await expect(page.locator('.searchLabel')).toHaveCount(0)
  await expect(page.locator('#q')).toHaveAttribute('aria-label', 'Recherche MISES!')
  await expect(page.locator('#searchGo')).toBeVisible()
  await expect(page.locator('button', { hasText: 'Rechercher' })).toHaveCount(0)
  await expect(page.locator('[data-tab="search"]')).toHaveCount(0)
  await expect(page.getByText('Dictée vocale', { exact: true })).toHaveCount(0)
  await expect(page.locator('#mic')).toBeVisible()
  for (const label of ['Trouver', 'Créer', 'Ranger', 'Préparer', 'Partager']) {
    await expect(page.locator('.goalNav summary', { hasText: label })).toHaveCount(1)
  }
  await expect(page.locator('[data-action="scan"]')).toBeVisible()
  await expect(page.locator('[data-action="photo"]')).toBeVisible()
  await expect(page.locator('[data-action="inventory"]')).toBeVisible()
  await expect(page.locator('[data-action="last-mise"]')).toBeVisible()
  // Exercice accessible une seule fois via Créer
  await page.getByText('Créer', { exact: true }).click()
  await expect(page.locator('#goalExercise')).toBeVisible()
  await expect(page.locator('[data-action="exercise"]')).toHaveCount(0)
})

test('grille 2 colonnes : dernier cartouche impair en pleine largeur (360 et Pixel 9)', async ({ page }) => {
  for (const size of [[360, 740], [412, 915], [1280, 800]]) {
    await page.setViewportSize({ width: size[0], height: size[1] })
    await page.goto('/')
    await page.getByText('Trouver', { exact: true }).click()
    const trouver = page.locator('.goalNav details').filter({ has: page.locator('summary', { hasText: 'Trouver' }) })
    await trouver.evaluate(node => { node.open = true })
    const buttons = trouver.locator('div > button')
    const count = await buttons.count()
    expect(count).toBe(3) // Créateur, Vibe et nouvelle rubrique Halloween
    if (size[0] <= 620) {
      const first = await buttons.nth(0).boundingBox()
      const second = await buttons.nth(1).boundingBox()
      expect(first).toBeTruthy()
      expect(second).toBeTruthy()
      // 2 items on 2-col: same row, neither spans full alone
      expect(Math.abs(first.y - second.y)).toBeLessThan(8)
      const halloween = await buttons.nth(2).boundingBox()
      const container = await trouver.locator('div').first().boundingBox()
      expect(halloween).toBeTruthy()
      expect(container).toBeTruthy()
      expect(halloween.width).toBeGreaterThan(container.width * 0.85)
    }
    // Force odd last child: open Créer which has 5 buttons
    await page.getByText('Créer', { exact: true }).click()
    const creer = page.locator('.goalNav details').filter({ has: page.locator('summary', { hasText: 'Créer' }) })
    await creer.evaluate(node => { node.open = true })
    const last = creer.locator('div > button').last()
    const box = await last.boundingBox()
    const parent = await creer.locator('div').first().boundingBox()
    expect(box).toBeTruthy()
    expect(parent).toBeTruthy()
    if (size[0] <= 620) {
      // 5 buttons → last alone spans full width of parent
      expect(box.width).toBeGreaterThan(parent.width * 0.85)
      const style = await last.evaluate(node => getComputedStyle(node).textAlign)
      expect(style).toBe('center')
    }
  }
})

test('recherche globale indexe objets et reste le seul champ', async ({ page }) => {
  await page.goto('/')
  await page.locator('#q').fill('mer')
  await page.locator('#q').press('Enter')
  await expect(page.locator('#searchResults')).toBeVisible()
  await expect(page.locator('input[type="search"], #q')).toHaveCount(1)
  await expect(page.locator('#q')).toHaveCount(1)
})
