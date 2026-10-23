import { test, expect } from '@playwright/test'

// 0.4.0-beta.36 : supabase-js est embarqué par Vite. Le chargement de l'app ET l'ouverture du dialogue ☁
// (qui charge le client Supabase) ne doivent contacter aucun hôte hors liste blanche, en particulier aucun CDN.
const allowed=host=>host==='localhost'||host==='127.0.0.1'||host==='errsklrioqfovhkdiejd.supabase.co'||host==='cdriccarboni.github.io'
test('aucun CDN tiers, y compris au chargement du client Supabase', async ({ page }) => {
  const outside=[]
  page.on('request',request=>{const host=new URL(request.url()).hostname;if(request.url().startsWith('http')&&!allowed(host))outside.push(request.url())})
  await page.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.goto('/')
  await expect(page.locator('#supabaseSyncBtn')).toBeVisible()
  await expect(async () => { await page.locator('#supabaseSyncBtn').click(); await expect(page.locator('#supabasePassword')).toBeVisible({ timeout: 1000 }) }).toPass()
  await page.waitForLoadState('networkidle')
  expect(outside).toEqual([])
})
