import { test, expect } from '@playwright/test'

// 0.4.0-beta.34 : connexion e-mail + mot de passe (accès testeurs Google Play) à côté du lien magique.
// Réseau Supabase simulé : aucun identifiant réel dans ce test.
test('le dialogue de connexion propose mot de passe + lien magique et traduit un refus', async ({ page }) => {
  let tokenCalls = 0, otpCalls = 0
  await page.route('**/auth/v1/token?grant_type=password', route => { tokenCalls++; route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' }) }) })
  await page.route('**/auth/v1/otp**', route => { otpCalls++; route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
  await page.goto('/')
  await expect(page.locator('#supabaseSyncBtn')).toBeVisible()
  await expect(async () => { await page.locator('#supabaseSyncBtn').click(); await expect(page.locator('#supabasePassword')).toBeVisible({ timeout: 1000 }) }).toPass()
  await expect(page.locator('#supabasePassword')).toBeVisible()
  await expect(page.locator('#supabasePasswordLogin')).toBeVisible()
  await expect(page.locator('#sendSupabaseLink')).toBeVisible()
  await page.fill('#supabaseEmail', 'testeur.fictif@example.com')
  await page.click('#supabasePasswordLogin')
  await expect(page.locator('#supabaseAuthStatus')).toHaveText('Entre ton mot de passe.')
  expect(tokenCalls).toBe(0)
  await page.fill('#supabasePassword', 'mauvais-mot-de-passe-fictif')
  await page.click('#supabasePasswordLogin')
  await expect(page.locator('#supabaseAuthStatus')).toHaveText('E-mail ou mot de passe incorrect.')
  expect(tokenCalls).toBe(1)
  await page.click('#sendSupabaseLink')
  await expect(page.locator('#supabaseAuthStatus')).toContainText('Lien envoyé')
  expect(otpCalls).toBe(1)
})
