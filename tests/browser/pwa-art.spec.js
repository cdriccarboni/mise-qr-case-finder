import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'

async function controlled(page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker?.ready
    return Boolean(navigator.serviceWorker?.controller && reg?.active)
  })
}

test('installability criteria, standalone launch, offline reload, restore and cache rollover', async ({ page, context }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await page.evaluate(async href => (await fetch(href)).json(), href)
  expect(manifest.name).toBe('MISES! — QR Case Finder')
  expect(manifest.short_name).toBe('MISES!')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.some(icon => icon.sizes === '192x192')).toBeTruthy()
  expect(manifest.icons.some(icon => icon.sizes === '512x512' && String(icon.purpose).includes('maskable'))).toBeTruthy()
  const pagesScope = new URL(manifest.scope, 'https://cdriccarboni.github.io/mise-qr-case-finder/manifest.webmanifest')
  expect(pagesScope.pathname).toBe('/mise-qr-case-finder/')
  expect(await page.evaluate(() => window.isSecureContext)).toBe(true)
  await controlled(page)

  await page.evaluate(async () => {
    const cache = await caches.open('workbox-precache-v2-mises-old')
    await cache.put('/legacy-marker', new Response('old'))
    const current = await navigator.serviceWorker.getRegistration()
    const url = current.active.scriptURL
    await current.unregister()
    await navigator.serviceWorker.register(url)
    await navigator.serviceWorker.ready
  })
  await page.waitForFunction(async () => !(await caches.keys()).includes('workbox-precache-v2-mises-old'))
  const names = await page.evaluate(() => caches.keys())
  expect(names.some(name => name.includes('mises-0.4.0-beta.1'))).toBeTruthy()

  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('mises-db')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction('objects', 'readwrite')
      tx.objectStore('objects').put({ id: 'obj-offline', name: 'Grelot hors ligne', sounds: [], tags: [], owned: true })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('#networkStatus')).toContainText('Hors ligne')
  await page.locator('#q').fill('Grelot hors ligne')
  await expect(page.locator('#searchResults')).toContainText('Grelot hors ligne')
  await context.setOffline(false)

  await page.close()
  const again = await context.newPage()
  await again.goto('/')
  await again.locator('#q').fill('Grelot hors ligne')
  await expect(again.locator('#searchResults')).toContainText('Grelot hors ligne')
  await again.close()
})

test('emulated standalone display mode still opens the app', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' })
  await context.addInitScript(() => {
    const orig = window.matchMedia.bind(window)
    window.matchMedia = query => {
      if (String(query).includes('display-mode') && String(query).includes('standalone')) {
        return { matches: true, media: String(query), onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false } }
      }
      return orig(query)
    }
  })
  const page = await context.newPage()
  await page.goto('/')
  expect(await page.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true)
  await expect(page.locator('header .miseWordmark')).toHaveAttribute('aria-label', 'mises !')
  await context.close()
})

test('a new service worker says a new version is available', async ({ page }) => {
  let served = 0
  await page.context().route('**/sw.js*', async route => {
    served += 1
    const response = await route.fetch()
    const headers = { ...response.headers() }
    delete headers['content-length']
    delete headers['content-encoding']
    const body = served === 1 ? `${await response.text()}\n// mises-installed-revision\n` : await response.text()
    await route.fulfill({ status: response.status(), headers, body })
  })
  await page.goto('/')
  await controlled(page)
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration()
    await reg.update()
  })
  await expect(page.locator('#toast')).toContainText('Nouvelle version disponible')
})

test('projectId opens, restores, attaches an old mise, and ignores a bad return address', async ({ page }) => {
  const posts = []
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()) })
  await page.goto('/')
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('mises-db')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction('mises', 'readwrite')
      tx.objectStore('mises').put({ id: 'mise-old', name: 'Mise d’avant le pont', objectIds: [], checked: [], createdAt: '2020-01-01T00:00:00.000Z' })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
  await page.goto('/?projectId=eac-atelier&projectName=Atelier%20EAC&source=art')
  await expect(page.locator('#projectContext')).toContainText('Atelier EAC')
  await expect(page.locator('#artReturn')).toHaveCount(0)
  await page.locator('#artAttachBtn').click()
  await expect(page.locator('#toast')).toContainText('Mise rattachée')
  await expect(page.locator('#mises')).toContainText('Mise d’avant le pont')
  await page.reload()
  await expect(page.locator('#mises')).toContainText('Mise d’avant le pont')
  await expect(page.locator('#artAttachBtn')).toHaveCount(0)
  expect(posts).toEqual([])

  await page.goto('/?projectId=show-inconnu&projectName=Spectacle%20neuf&source=art&returnUrl=https%3A%2F%2Fart.example%2Fretour')
  await expect(page.locator('#artReturn')).toHaveAttribute('href', 'https://art.example/retour')
  await expect(page.locator('#miseCards')).toContainText('Spectacle neuf')
  await page.reload()
  await expect(page.locator('#miseCards article')).toHaveCount(2)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#artSummary').click()
  ])
  expect(download.suggestedFilename()).toBe('MISES-resume-art.json')
  const payload = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(payload.kind).toBe('mises-art-summary')
  expect(payload.projectId).toBe('show-inconnu')
  expect(payload.caseCount).toEqual(expect.any(Number))
  expect(payload.objectCount).toEqual(expect.any(Number))
  expect(payload.objects).toBeUndefined()

  await page.goto('/?projectId=show-bad&projectName=Sans%20retour&returnUrl=javascript:alert(1)')
  await expect(page.locator('#artReturn')).toHaveCount(0)
  await page.goto('/?projectId=not%20an%20id&projectName=Nope')
  await expect(page.locator('#projectContext')).toBeHidden()

  await page.goto('/?source=art&returnUrl=https%3A%2F%2Fart.example%2Faccueil')
  await expect(page.locator('#projectContext')).toBeVisible()
  await expect(page.locator('#projectContext')).toContainText('aucun spectacle sélectionné')
  await expect(page.locator('#artReturn')).toHaveAttribute('href', 'https://art.example/accueil')
  await expect(page.locator('#artAttachBtn')).toHaveCount(0)
  await expect(page.locator('#artSummary')).toHaveCount(0)
})
