import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('the visible name is MISES! and the wordmark says mises !', () => {
  const html = read('../index.html')
  const main = read('../src/main.js')
  const wordmark = read('../src/brand/wordmark.svg')
  const icon = read('../public/icon.svg')
  assert.match(html, /<title>MISES! — QR Case Finder<\/title>/)
  assert.match(html, /apple-mobile-web-app-title" content="MISES!"/)
  assert.match(html, /<b>mises !<\/b>/)
  assert.match(read('../vite.config.js'), /name:'MISES! — QR Case Finder', short_name:'MISES!'/)
  assert.match(read('../android/app/src/main/res/values/strings.xml'), /<string name="app_name">MISES!<\/string>/)
  assert.match(read('../android/app/src/main/AndroidManifest.xml'), /android:label="MISES!"/)
  assert.match(main, /MISES! — Une création de Cédric Carboni pour Acousmatic Theatre/)
  assert.match(wordmark, /aria-label="mises !"/)
  assert.equal(wordmark.match(/class="markDot"/g).length, 2)
  assert.match(icon, /aria-label="mise !"/)
  assert.match(icon, /viewBox="0 0 64 64"/)
  assert.equal(read('../src/identity.css').includes('--ink:#D12A74'), true)
})
