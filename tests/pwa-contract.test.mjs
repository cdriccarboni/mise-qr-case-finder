import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DATA_STORES } from '../src/data-bruitage.js'
import { APP_VERSION } from '../src/version.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('manifest scope resolves to the GitHub Pages path and the Android asset path', () => {
  const vite = read('../vite.config.js')
  assert.match(vite, /name:'MISES! — QR Case Finder', short_name:'MISES!'/)
  assert.match(vite, /display:'standalone', start_url:'\.\/', scope:'\.\/'/)
  assert.match(vite, /sizes:'192x192'/)
  assert.match(vite, /sizes:'512x512'/)
  assert.match(vite, /purpose:'any maskable'/)
  assert.ok(vite.includes(`cacheId:'mises-${APP_VERSION}'`))
  assert.match(vite, /cleanupOutdatedCaches:true/)
  assert.match(vite, /clientsClaim:true/)
  const pages = new URL('./', 'https://cdriccarboni.github.io/mise-qr-case-finder/manifest.webmanifest')
  assert.equal(pages.pathname, '/mise-qr-case-finder/')
  const android = new URL('./', 'https://appassets.androidplatform.net/assets/www/manifest.webmanifest')
  assert.equal(android.pathname, '/assets/www/')
  const main = read('../src/main.js')
  assert.match(main, /Nouvelle version disponible/)
})

test('Data Bruitage is the catalogue and the acoustic kit is only a view', () => {
  for (const store of ['objects', 'sounds', 'objectSounds', 'aliases', 'mises', 'cases', 'sources', 'review', 'corrections']) {
    assert.equal(DATA_STORES.includes(store), true)
  }
  const main = read('../src/main.js')
  assert.match(main, /Un kit est une vue sur le parc, pas la base Data Bruitage/)
  assert.match(main, /Kit · une vue, pas toute la base/)
  assert.doesNotMatch(main, /seule source/)
  const java = read('../android/app/src/main/java/fr/acousmatictheatre/mises/MainActivity.java')
  assert.match(java, /localUrlFor/)
  assert.match(java, /mise-qr-case-finder/)
  const manifest = read('../android/app/src/main/AndroidManifest.xml')
  assert.match(manifest, /android:scheme="https" android:host="cdriccarboni.github.io" android:pathPrefix="\/mise-qr-case-finder"/)
})
