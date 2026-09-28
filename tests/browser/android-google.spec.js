import { test, expect } from '@playwright/test'

test('sans pont Android, la connexion Google reste proposée et Identity Services n’est pas chargé au démarrage', async ({ page }) => {
  const requests = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/')
  await page.getByText('Partager', { exact: true }).click()
  await expect(page.locator('#goalGoogle')).toHaveText('Connexion Google')
  expect(requests.some(url => url.includes('accounts.google.com') || url.includes('googleapis.com'))).toBe(false)
})

test('le pont Android affiche le refus et n’appelle pas Google', async ({ page }) => {
  await page.addInitScript(() => {
    window.MisesAndroid = {
      googleSignInAvailable: () => false,
      googleSignInMessage: () => 'Connexion Google bloquée dans ce test Android.'
    }
  })
  const requests = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/')
  await page.getByText('Partager', { exact: true }).click()
  await expect(page.locator('#goalGoogle')).toHaveText('Connexion Google indisponible')
  await page.locator('#goalGoogle').click()
  const dialog = page.locator('#modal')
  await expect(dialog).toContainText('Connexion Google bloquée dans ce test Android.')
  await expect(dialog).toContainText('sauvegarde JSON')
  await page.locator('#closeAndroidGoogle').click()
  await expect(dialog).toBeHidden()
  await page.locator('#goalShare').click()
  await expect(dialog).toContainText('Connexion Google bloquée dans ce test Android.')
  expect(requests.some(url => url.includes('accounts.google.com') || url.includes('googleapis.com') || url.includes('gstatic.com'))).toBe(false)
})
