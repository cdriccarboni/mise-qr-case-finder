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
  assert.match(main, /<p class="aboutCredit">© \$\{externalAnchor\(AUTHOR_WEBSITE_URL, 'Cédric Carboni'/)
  assert.match(main, /© Cédric Carboni/)
  assert.doesNotMatch(main, /Code & création|Une création de/)
  assert.match(wordmark, /aria-label="mises !"/)
  assert.equal(wordmark.match(/class="markDot"/g).length, 2)
  assert.match(icon, /aria-label="mise !"/)
  assert.match(icon, /viewBox="0 0 64 64"/)
  assert.match(icon, /<polygon/)
  assert.equal(read('../src/identity.css').includes('--ink:#D12A74'), true)
})

test('home navigation exposes five separate goal cartouches', () => {
  const main = read('../src/main.js')
  for (const label of ['Trouver', 'Créer', 'Ranger', 'Préparer', 'Partager']) {
    assert.match(main, new RegExp(`<summary>${label}</summary>`))
  }
  assert.doesNotMatch(main, /Trouver & créer|Ranger & préparer|Partager & outils/)
})

test('home keeps a single global search field and no redundant Recherche cartouches', () => {
  const main = read('../src/main.js')
  assert.equal(main.match(/id="q"/g)?.length, 1)
  assert.match(main, /searchLabel" for="q">Recherche globale MISES!/)
  assert.doesNotMatch(main, /data-action="search">Rechercher/)
  assert.doesNotMatch(main, /data-action="speak">Dictée vocale/)
  assert.doesNotMatch(main, /<button data-tab="search"[^>]*>Recherche</)
  assert.match(main, /data-action="scan">Scanner un QR/)
  assert.match(main, /data-action="photo">Ajouter une photo/)
  assert.match(main, /data-action="inventory">Inventaire photo/)
  assert.match(main, /data-action="last-mise">Dernière mise/)
  assert.match(main, /function searchEntities/)
  // Exercice / vibe / hands only via cartouches, not duplicate quick row
  assert.doesNotMatch(main, /terrainQuick/)
  assert.doesNotMatch(main, /data-action="exercise"/)
  assert.doesNotMatch(main, /data-action="vibe"/)
  assert.doesNotMatch(main, /data-action="hands"/)
})

test('tile grids fill the last odd cell on two-column layouts', () => {
  const css = read('../src/style.css')
  assert.match(css, /\.goalNav details>div>:last-child:nth-child\(odd\)/)
  assert.match(css, /\.quick>:last-child:nth-child\(odd\)/)
  assert.match(css, /grid-column:1\/-1/)
})
