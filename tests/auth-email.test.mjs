import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeEmail, validateEmail, authErrorMessage, googleProviderEnabled } from '../src/supabase-client.js'

test('e-mail : NFKC, invisibles, espaces, majuscules', () => {
  assert.equal(normalizeEmail(' Cdric.Carboni@Gmail.com\u200b\u00a0'), 'cdric.carboni@gmail.com')
  assert.equal(normalizeEmail('\ufeffcdric\u2060.carboni@gmail.com '), 'cdric.carboni@gmail.com')
  assert.equal(normalizeEmail('ｃｄｒｉｃ@gmail.com'), 'cdric@gmail.com')
  assert.equal(validateEmail('CDRIC.CARBONI@gmail.com\u200d').ok, true)
})
test('e-mail invalide : message français avec l’adresse saisie', () => {
  for (const bad of ['cédric.carboni@gmail.com', 'cdric carboni@gmail.com'.replace(' ', ',') , 'cdric@gmail', 'cdric..x@gmail.com', '@gmail.com']) {
    const v = validateEmail(bad); assert.equal(v.ok, false, bad); assert.match(v.message, /Adresse refusée/); assert.ok(v.message.includes(bad.trim()))
  }
  assert.match(validateEmail('cédric@gmail.com').message, /ni accent, ni espace/)
})
test('erreurs Supabase → français', () => {
  assert.match(authErrorMessage({ message: 'Unable to validate email address: invalid format' }), /ni accent/)
  assert.match(authErrorMessage({ message: 'Unsupported provider: provider is not enabled' }), /Google n’est pas activée/)
  assert.match(authErrorMessage({ message: 'Email rate limit exceeded', code: 'over_email_send_rate_limit' }), /Trop de demandes/)
  assert.match(authErrorMessage({ message: 'Email link is invalid or has expired' }), /expiré/)
  assert.match(authErrorMessage({ message: 'invalid request: both auth code and code verifier should be non-empty' }), /même appareil|appareil où/)
  assert.match(authErrorMessage(new Error('Failed to fetch')), /réseau/)
  assert.doesNotMatch(authErrorMessage({ message: 'weird' }), /weird/)
})
test('Google masqué sauf fournisseur activé (/auth/v1/settings, défaut : off)', async () => {
  const f = body => async () => ({ ok: true, json: async () => body })
  assert.equal(await googleProviderEnabled(f({ external: { google: false } })), false)
  assert.equal(await googleProviderEnabled(f({ external: { google: true } })), true)
  assert.equal(await googleProviderEnabled(async () => { throw new Error('offline') }), false)
  const main = readFileSync('src/main.js', 'utf8')
  assert.match(main, /<button id="googleSupabaseLogin" type="button" class="ghost" hidden>/)
  assert.match(main, /id="supabaseEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false"/)
  assert.match(main, /const v=validateEmail\(raw\);if\(!v\.ok\)\{status\.textContent=v\.message;return\}/)
})
