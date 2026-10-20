import { test, expect } from '@playwright/test'

// 0.4.0-beta.33 : actions secondaires repliées (« Plus d’actions », « Ambiances & jeux ») — ouvertes pour ces parcours.
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { const t = setInterval(() => { const ds = document.querySelectorAll('.moreShortcuts,.secondaryTools'); if (ds.length) { ds.forEach(d => { d.open = true }); clearInterval(t) } }, 20) }) })


test('themed sound browser offers 14 relevant universes and source filters',async({page})=>{
  await page.goto('/')
  await page.locator('[data-tab="halloween"]').click()
  await expect(page.locator('#halloween')).toBeVisible()
  await expect(page.locator('#themePack option')).toHaveCount(14)
  await expect(page.locator('#themePack')).toHaveValue('halloween')
  const halloweenCount=Number((await page.locator('#halloweenResults .hint').innerText()).match(/(\d+) résultat/)[1])
  expect(halloweenCount).toBeGreaterThan(0)
  expect(halloweenCount).toBeLessThan(30)
  await page.locator('#themePack').selectOption('noel')
  await expect(page.locator('#halloweenResults')).toContainText('Sons d’hiver')
  await expect(page.locator('#halloweenResults .card').first()).toBeVisible()
  await page.locator('#themeSource').selectOption('mine')
  await expect(page.locator('#halloweenResults')).toContainText('0 résultat(s) pertinent(s)')
  await page.locator('#themeSource').selectOption('public')
  await expect(page.locator('#halloweenResults .card').first()).toBeVisible()
  await page.locator('#halloweenFilter').fill('neige')
  await expect(page.locator('#halloweenResults .card').first()).toBeVisible()
})

test('ambiences stay operable in mobile layout',async({page})=>{
  await page.setViewportSize({width:360,height:740})
  await page.goto('/')
  await page.locator('[data-tab="halloween"]').click()
  await page.locator('#themePack').selectOption('mer')
  await expect(page.locator('#halloweenResults .card').first()).toBeVisible()
  await page.locator('[data-theme-group="ship"]').click()
  await expect(page.locator('[data-theme-group="ship"]')).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('#themePack')).toBeVisible()
  await expect(page.locator('#halloweenFilter')).toBeVisible()
})
