import { test, expect } from '@playwright/test'

const layouts = [
  { name: 'pixel9-portrait', width: 412, height: 915, top: 54, right: 0, bottom: 48, left: 0 },
  { name: 'pixel9-paysage', width: 915, height: 412, top: 48, right: 0, bottom: 24, left: 48 },
  { name: 'tablette-portrait', width: 800, height: 1280, top: 48, right: 0, bottom: 24, left: 0 },
  { name: 'tablette-paysage', width: 1280, height: 800, top: 48, right: 24, bottom: 24, left: 24 }
]

async function applyInsets(page, insets) {
  await page.evaluate(value => {
    const node = document.documentElement
    delete node.dataset.nativeSafe
    node.style.setProperty('--android-safe-top', `${value.top}px`)
    node.style.setProperty('--android-safe-right', `${value.right}px`)
    node.style.setProperty('--android-safe-bottom', `${value.bottom}px`)
    node.style.setProperty('--android-safe-left', `${value.left}px`)
  }, insets)
}

test('le logo reste sous l’encoche, sans double marge, au téléphone et sur tablette', async ({ page }) => {
  test.setTimeout(120000)
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  for (const layout of layouts) {
    await page.setViewportSize({ width: layout.width, height: layout.height })
    await applyInsets(page, layout)
    const pads = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      const header = getComputedStyle(document.querySelector('header'))
      return {
        top: body.paddingTop,
        right: body.paddingRight,
        bottom: body.paddingBottom,
        left: body.paddingLeft,
        headerTop: parseFloat(header.paddingTop),
        headerLeft: parseFloat(header.paddingLeft)
      }
    })
    expect(pads.top, layout.name).toBe(`${layout.top}px`)
    expect(pads.right, layout.name).toBe(`${layout.right}px`)
    expect(pads.bottom, layout.name).toBe(`${layout.bottom}px`)
    expect(pads.left, layout.name).toBe(`${layout.left}px`)
    expect(pads.headerTop, layout.name).toBeLessThan(30)
    expect(pads.headerLeft, layout.name).toBeLessThan(30)

    const mark = await page.locator('header .miseWordmark').boundingBox()
    expect(mark, layout.name).toBeTruthy()
    expect(mark.y, layout.name).toBeGreaterThanOrEqual(layout.top - 1)
    expect(mark.y, layout.name).toBeLessThanOrEqual(layout.top + 40)
    expect(mark.x, layout.name).toBeGreaterThanOrEqual(layout.left - 1)

    const header = await page.locator('header').boundingBox()
    expect(header.x + header.width, layout.name).toBeLessThanOrEqual(layout.width - layout.right + 1)

    await page.locator('.goalNav details').last().evaluate(node => { node.open = true })
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const card = await page.locator('.goalNav details').last().boundingBox()
    expect(card.y + card.height, layout.name).toBeGreaterThan(layout.bottom)
    expect(card.y + card.height, layout.name).toBeLessThanOrEqual(layout.height - layout.bottom + 1)
    await page.evaluate(() => window.scrollTo(0, 0))
  }
})

test('une modale et le clavier restent dans la zone sûre', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await applyInsets(page, { top: 54, right: 0, bottom: 48, left: 0 })
  await page.locator('#preferencesBtn').click()
  const closePreferences = await page.locator('#closePreferences').boundingBox()
  expect(closePreferences).toBeTruthy()
  expect(closePreferences.width).toBeGreaterThanOrEqual(44)
  expect(closePreferences.height).toBeGreaterThanOrEqual(44)
  expect(closePreferences.y).toBeGreaterThanOrEqual(54 - 1)
  expect(closePreferences.x + closePreferences.width).toBeLessThanOrEqual(412 + 1)
  await page.locator('#preferencesAbout').click()
  const about = page.locator('#aboutDlg')
  await expect(about).toBeVisible()
  const box = await about.boundingBox()
  expect(box.y).toBeGreaterThanOrEqual(54 - 1)
  expect(box.y + box.height).toBeLessThanOrEqual(915 - 48 + 1)
  await page.locator('#closeAbout').click()

  await applyInsets(page, { top: 54, right: 0, bottom: 320, left: 0 })
  const keyboard = await page.evaluate(() => {
    const toast = document.querySelector('#toast')
    toast.style.transition = 'none'
    return {
      body: getComputedStyle(document.body).paddingBottom,
      toast: getComputedStyle(toast).bottom,
      declared: getComputedStyle(toast).getPropertyValue('bottom')
    }
  })
  expect(keyboard.body).toBe('320px')
  expect(parseFloat(keyboard.toast), JSON.stringify(keyboard)).toBeGreaterThanOrEqual(320)
  const splash = await page.evaluate(() => {
    const el = document.createElement('div')
    el.className = 'splash'
    document.body.prepend(el)
    const top = el.getBoundingClientRect().top
    const min = parseFloat(getComputedStyle(el).minHeight)
    el.remove()
    return { top, min }
  })
  expect(splash.top).toBeGreaterThanOrEqual(54 - 1)
  expect(splash.min).toBeGreaterThan(400)
})
