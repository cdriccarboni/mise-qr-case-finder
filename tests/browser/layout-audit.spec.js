import { test, expect } from '@playwright/test'

const tabIds = ['search','inventory','cases','kits','mises','publicLibrary','fabrications','activities','vibe','exercises','creator']

async function activateTab(page, id) {
  await page.evaluate(tabId => {
    document.querySelectorAll('.tab').forEach(node => node.classList.toggle('active', node.id === tabId))
  }, id)
}

async function geometryIssues(page, scope = '.tab.active') {
  return page.evaluate(selector => {
    const root = document.querySelector(selector)
    if (!root) return ['missing scope']
    const vw = document.documentElement.clientWidth
    const visible = el => {
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0
    }
    const nodes = [...root.querySelectorAll('.panel,.card,.result,.empty,.challenge,.participantPlan,.suggestCard,.ownedCard,.preferenceActionBlock,.publicStats>span,.sectionhead')]
      .filter(visible)
    const issues = []
    for (const el of nodes) {
      const r = el.getBoundingClientRect()
      if (r.left < -1 || r.right > vw + 1) issues.push(`edge:${el.className}:${r.left.toFixed(1)}..${r.right.toFixed(1)}/${vw}`)
      const style = getComputedStyle(el)
      if (!['auto','scroll'].includes(style.overflowX) && el.scrollWidth > el.clientWidth + 2) {
        issues.push(`overflow:${el.className}:${el.scrollWidth}/${el.clientWidth}`)
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        if (a.contains(b) || b.contains(a)) continue
        const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect()
        const w = Math.min(ar.right, br.right) - Math.max(ar.left, br.left)
        const h = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top)
        if (w > 2 && h > 2) issues.push(`overlap:${a.className}<->${b.className}`)
      }
    }
    return issues
  }, scope)
}

test('chaque sous-onglet reste dans les bords sur un viewport Pixel 9', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.11')
  for (const id of tabIds) {
    await activateTab(page, id)
    expect(await geometryIssues(page), id).toEqual([])
  }
})

test('Vibe garde ses dessins centrés, ses boutons propres et sa couleur globale', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.11')
  await page.locator('[data-tab="vibe"]').click()
  await page.locator('#vibePrompt').fill('forêt nocturne')
  await page.locator('#runVibe').click()
  expect(await geometryIssues(page)).toEqual([])

  const centers = await page.evaluate(() => {
    const strip = document.querySelector('#vibe .tokenStrip').getBoundingClientRect()
    const svg = document.querySelector('#vibe .tokenStrip svg').getBoundingClientRect()
    return {
      delta: Math.abs((strip.left + strip.width / 2) - (svg.left + svg.width / 2)),
      svgRight: svg.right,
      stripRight: strip.right
    }
  })
  expect(centers.delta).toBeLessThan(1.5)
  expect(centers.svgRight).toBeLessThanOrEqual(centers.stripRight + 1)

  await page.locator('#preferencesBtn').click()
  await page.getByRole('button', { name: 'Orange' }).click()
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim())).toBe('#E25A1C')
  await expect.poll(() => page.locator('meta[name="theme-color"]').getAttribute('content')).toBe('#E25A1C')
  const fill = await page.locator('header .miseWordmark .markDot').first().evaluate(node => getComputedStyle(node).fill)
  expect(fill).toBe('rgb(226, 90, 28)')
  await page.reload()
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim())).toBe('#E25A1C')
})

test('les cartouches seuls sur leur ligne centrent leur mot', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.11')
  const last = page.locator('.fieldShortcuts > button').last()
  const parent = page.locator('.fieldShortcuts')
  const [box, pbox, textAlign] = await Promise.all([
    last.boundingBox(),
    parent.boundingBox(),
    last.evaluate(node => getComputedStyle(node).textAlign)
  ])
  expect(box.width).toBeGreaterThan(pbox.width * .85)
  expect(textAlign).toBe('center')
})
