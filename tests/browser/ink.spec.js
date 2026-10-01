import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const shots = new URL('../../test-results/screenshots', import.meta.url).pathname

async function shoot(locator, path) {
  let last
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await locator.screenshot({ path, animations: 'disabled', timeout: 20000 })
      return
    } catch (error) {
      last = error
      await locator.page().waitForTimeout(400)
    }
  }
  throw last
}

async function fills(page) {
  return page.evaluate(() => {
    const dot = getComputedStyle(document.querySelector('header .miseWordmark .markDot')).fill
    const ghost = getComputedStyle(document.querySelector('header .miseWordmark .stampGhost path')).fill
    const letters = getComputedStyle(document.querySelector('header .miseWordmark .letters')).fill
    const root = getComputedStyle(document.documentElement)
    const button = document.querySelector('#addObject')
    const buttonStyle = getComputedStyle(button)
    const card = document.querySelector('.empty, .goalNav details')
    return {
      dot, ghost, letters,
      ink: root.getPropertyValue('--ink').trim(),
      onInk: root.getPropertyValue('--on-ink').trim(),
      buttonBg: buttonStyle.backgroundColor,
      buttonFg: buttonStyle.color,
      border: getComputedStyle(card).borderTopColor
    }
  })
}

test('ink choice recolors the logo, stays readable, and is restored', async ({ page }) => {
  await mkdir(shots, { recursive: true })
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.6')
  await page.setViewportSize({ width: 900, height: 800 })
  const rose = await fills(page)
  expect(rose.dot).toBe('rgb(209, 42, 116)')
  expect(rose.ghost).toBe(rose.dot)
  expect(rose.letters).not.toBe(rose.dot)
  expect(rose.onInk.toLowerCase()).toMatch(/^#f{3,6}$/)
  await shoot(page.locator('header'), `${shots}/logo-rose.png`)

  await page.locator('#preferencesBtn').click()
  await page.locator('#themeMode').selectOption('dark')
  await page.getByRole('button', { name: 'Bleu' }).click()
  await page.locator('#closePreferences').click()
  const blue = await fills(page)
  expect(blue.dot).toBe('rgb(29, 78, 137)')
  expect(blue.ghost).toBe(blue.dot)
  expect(blue.letters).not.toBe(blue.dot)
  expect(blue.buttonBg).toBe('rgb(29, 78, 137)')
  expect(blue.buttonFg).toBe('rgb(255, 255, 255)')
  expect(blue.ink.toUpperCase()).toBe('#1D4E89')
  await shoot(page.locator('header'), `${shots}/logo-bleu.png`)

  await page.locator('#preferencesBtn').click()
  await page.getByRole('button', { name: 'Vert' }).click()
  await page.locator('#closePreferences').click()
  const green = await fills(page)
  expect(green.dot).toBe('rgb(30, 122, 70)')
  expect(green.ghost).toBe(green.dot)
  await shoot(page.locator('header'), `${shots}/logo-vert.png`)

  const contrast = await page.evaluate(() => {
    const channels = value => {
      const parts = value.match(/[\d.]+/g).slice(0, 3).map(Number)
      return value.startsWith('color(') ? parts.map(channel => channel * 255) : parts
    }
    const lum = rgb => {
      const linear = channel => {
        const c = channel / 255
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      }
      const [r, g, b] = channels(rgb)
      return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
    }
    const card = document.querySelector('.goalNav details')
    const probe = document.createElement('span')
    probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--ink')
    document.body.append(probe)
    const ink = getComputedStyle(probe).color
    probe.remove()
    return { border: lum(getComputedStyle(card).borderTopColor), ink: lum(ink) }
  })
  expect(contrast.border).toBeGreaterThan(contrast.ink)

  await page.locator('#preferencesBtn').click()
  await page.locator('#inkCustom').evaluate(input => {
    input.value = '#f4e04d'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.locator('#closePreferences').click()
  const light = await fills(page)
  expect(light.buttonFg).toBe('rgb(22, 21, 19)')
  expect(light.dot).toBe('rgb(244, 224, 77)')

  await page.locator('#preferencesBtn').click()
  await page.locator('#themeMode').selectOption('regie')
  await page.locator('#closePreferences').click()
  const regie = await fills(page)
  expect(regie.dot).toBe('rgb(0, 0, 0)')
  expect(regie.ghost).toBe('rgb(0, 0, 0)')
  expect(regie.letters).toBe('rgb(0, 0, 0)')
  expect(regie.buttonBg).toBe('rgb(255, 255, 255)')
  expect(regie.buttonFg).toBe('rgb(0, 0, 0)')

  await page.locator('#preferencesBtn').click()
  await page.locator('#themeMode').selectOption('dark')
  await page.locator('#inkDefault').click()
  await page.locator('#closePreferences').click()
  await expect.poll(() => fills(page).then(value => value.dot)).toBe('rgb(209, 42, 116)')
  await page.reload()
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.6')
  const restored = await fills(page)
  expect(restored.dot).toBe('rgb(209, 42, 116)')
  expect(await page.evaluate(() => localStorage.getItem('mises-ink'))).toBeNull()
})
