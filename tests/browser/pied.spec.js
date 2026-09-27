import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const shots = '/opt/cursor/artifacts/screenshots'

async function shoot(page, path) {
  let last
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.screenshot({ path, animations: 'disabled', caret: 'hide', timeout: 20000 })
      return
    } catch (error) {
      last = error
      await page.waitForTimeout(400)
    }
  }
  throw last
}

test('le dernier cartouche reste entier en bas d’écran, dans les trois thèmes', async ({ page }) => {
  test.setTimeout(120000)
  await mkdir(shots, { recursive: true })
  await page.addInitScript(() => {
    document.documentElement.style.setProperty('--android-safe-bottom', '48px')
  })
  const themes = [['dark', 'sombre'], ['light', 'clair'], ['regie', 'regie']]
  const sizes = [[360, 740], [412, 915]]
  for (const [theme, label] of themes) {
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      await page.goto('/')
      await page.evaluate(mode => localStorage.setItem('mises-theme-mode', mode), theme)
      await page.reload()
      await page.evaluate(async () => { await navigator.serviceWorker.ready })
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator('.goalNav details').last()).toBeVisible()
      await page.evaluate(() => document.documentElement.style.setProperty('--android-safe-bottom', '48px'))
      if (width === 360) await shoot(page, `${shots}/rose-${label}-360x740.png`)
      const last = page.locator('.goalNav details').last()
      await last.evaluate(node => { node.open = true })
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const box = await last.boundingBox()
      expect(box).toBeTruthy()
      expect(box.y).toBeGreaterThanOrEqual(-1)
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1)
      await shoot(page, `${shots}/pied-${label}-${width}x${height}.png`)
    }
  }
})
