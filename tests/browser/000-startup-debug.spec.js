import { test, expect } from '@playwright/test'

test('DEBUG startup', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Document.prototype.querySelector
    const misses = []
    window.__misesQueryMisses = misses
    Document.prototype.querySelector = function(selector) {
      const result = original.call(this, selector)
      if (!result && typeof selector === 'string' && /^#[A-Za-z0-9_-]+$/.test(selector)) {
        misses.push({ selector, stack: new Error().stack })
      }
      return result
    }
  })
  const events = []
  page.on('console', msg => events.push({ kind:'console', type:msg.type(), text:msg.text() }))
  page.on('pageerror', error => events.push({ kind:'pageerror', text:error.stack || error.message }))
  page.on('requestfailed', request => events.push({ kind:'requestfailed', url:request.url(), failure:request.failure()?.errorText || 'unknown' }))
  await page.goto('/', { waitUntil:'domcontentloaded' })
  await page.waitForTimeout(5000)
  const state = await page.evaluate(() => ({
    ready: document.readyState,
    version: document.querySelector('#appVersion')?.textContent || null,
    q: Boolean(document.querySelector('#q')),
    bodyText: document.body.innerText.slice(0,1200),
    misses: window.__misesQueryMisses?.slice(-30) || []
  }))
  console.log('DEBUG_STARTUP_STATE='+JSON.stringify(state))
  console.log('DEBUG_STARTUP_EVENTS='+JSON.stringify(events))
  expect(state.version).toBe('0.4.0-beta.9')
})
