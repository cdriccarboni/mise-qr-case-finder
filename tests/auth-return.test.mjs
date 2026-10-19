import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseAuthReturn, cleanAuthUrl, completeSupabaseAuthFromUrl, authRedirectUrl, SUPABASE_APP_REDIRECT_URL } from '../src/supabase-client.js'

const LOCAL = 'https://appassets.androidplatform.net/assets/www/index.html'
test('redirectTo : schéma de l’app sur Android, PWA publique sinon', () => {
  assert.equal(authRedirectUrl({ MisesAndroid: { openAuthUrl() {} } }), 'fr.acousmatictheatre.mises://auth-callback')
  assert.equal(authRedirectUrl({}), 'https://cdriccarboni.github.io/mise-qr-case-finder/')
})
test('retour PKCE : ?code= échangé via exchangeCodeForSession, URL nettoyée', async () => {
  const calls = []
  const client = { auth: { exchangeCodeForSession: async c => { calls.push(c); return { data: { session: { user: { id: 'u' } } }, error: null } } } }
  const r = await completeSupabaseAuthFromUrl(`${LOCAL}?code=abc123`, client)
  assert.equal(r.handled, true); assert.deepEqual(calls, ['abc123'])
  assert.equal(cleanAuthUrl(`${LOCAL}?code=abc123&case=X`), `${LOCAL}?case=X`)
  assert.deepEqual(await completeSupabaseAuthFromUrl(`${LOCAL}?case=X`, client), { handled: false })
})
test('retour en erreur (lien expiré) : message clair', async () => {
  assert.deepEqual(parseAuthReturn(`${LOCAL}#error=access_denied&error_description=Email+link+is+invalid+or+has+expired`), { error: 'Email link is invalid or has expired' })
  await assert.rejects(completeSupabaseAuthFromUrl(`${LOCAL}?error_description=expired`, {}), /expired/)
})
test('Android : intent-filter du schéma, Custom Tab pour Google, synchro auto + retour d’erreur', () => {
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
  assert.match(manifest, /android:scheme="fr\.acousmatictheatre\.mises" android:host="auth-callback"/)
  const java = readFileSync('android/app/src/main/java/fr/acousmatictheatre/mises/MainActivity.java', 'utf8')
  assert.match(java, /CustomTabsIntent/); assert.match(java, /startsWith\("\/auth\/v1\/authorize"\)/)
  assert.match(java, /String auth = authCallbackUrl\(uri\);/)
  assert.match(readFileSync('android/app/src/main/java/fr/acousmatictheatre/mises/AndroidShellBridge.java', 'utf8'), /public void openAuthUrl/)
  const client = readFileSync('src/supabase-client.js', 'utf8')
  assert.match(client, /flowType:'pkce'/); assert.match(client, /skipBrowserRedirect:android/)
  const main = readFileSync('src/main.js', 'utf8')
  assert.match(main, /setTimeout\(\(\)=>finishSupabaseAuthReturn\(\),0\)/)
  assert.match(main, /scheduleSupabaseSync\(\)\}\n\}/)
  assert.match(main, /Synchronisation impossible/)
  assert.equal(SUPABASE_APP_REDIRECT_URL, 'fr.acousmatictheatre.mises://auth-callback')
})
test('bouton × : sous la zone sûre, cible 48 dp', () => {
  const css = readFileSync('src/style.css', 'utf8')
  assert.match(css, /dialog\[open\]\{margin-top:calc\(var\(--safe-top\) \+ 14px\)\}/)
  assert.match(css, /\.dialoghead>button,button\[id\^="close"\],\[data-close\]\{min-width:48px;min-height:48px/)
})
