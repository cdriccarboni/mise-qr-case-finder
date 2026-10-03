import { test, expect } from '@playwright/test'

test('DEBUG startup', async ({ page }) => {
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
    appHtml: document.querySelector('#app')?.innerHTML.slice(0,800) || ''
  }))
  console.log('DEBUG_STARTUP_STATE='+JSON.stringify(state))
  console.log('DEBUG_STARTUP_EVENTS='+JSON.stringify(events))
  expect(state.version).toBe('0.4.0-beta.9')
})
