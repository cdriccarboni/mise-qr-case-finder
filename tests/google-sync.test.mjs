import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DRIVE_SCOPE, GOOGLE_SCOPES, ANDROID_GOOGLE_SIGNIN_MESSAGE,
  androidGoogleSignInBlocked, googleSignInUnavailableMessage, artGoogleSession, requestGoogleSession
} from '../src/google-sync.js'

test('le scope Drive reste le scope complet, pas drive.file', () => {
  assert.equal(DRIVE_SCOPE, 'https://www.googleapis.com/auth/drive')
  assert.equal(GOOGLE_SCOPES.includes('drive.file'), false)
  assert.match(GOOGLE_SCOPES, /^openid email profile /)
})

test('sans pont Android, la connexion Google n’est pas bloquée', () => {
  delete globalThis.MisesAndroid
  assert.equal(androidGoogleSignInBlocked(), false)
  assert.equal(googleSignInUnavailableMessage(), ANDROID_GOOGLE_SIGNIN_MESSAGE)
})

test('le pont Android bloque la session et le chargement Google', async () => {
  globalThis.MisesAndroid = {
    googleSignInAvailable: () => false,
    googleSignInMessage: () => 'refus webview de test'
  }
  assert.equal(androidGoogleSignInBlocked(), true)
  assert.equal(artGoogleSession(), null)
  assert.equal(googleSignInUnavailableMessage(), 'refus webview de test')
  await assert.rejects(requestGoogleSession(), /refus webview de test/)
  delete globalThis.MisesAndroid
})

test('la politique publique cite Drive, le contact et les données réellement stockées', () => {
  const html = readFileSync(new URL('../public/privacy.html', import.meta.url), 'utf8')
  assert.match(html, /Google Drive/)
  assert.match(html, /cdric\.carboni@gmail\.com/)
  assert.match(html, /IndexedDB/)
  assert.match(html, /mémos sonores/)
  assert.match(html, /mises-data\.json/)
  assert.match(html, /mise-data\.json/)
  assert.match(html, /application Android/)
  assert.match(html, /Cédric Carboni/)
})
