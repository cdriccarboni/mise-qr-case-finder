import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('mobile UI contract keeps safe close targets, centered decorative strips and global ink', () => {
  const main = read('../src/main.js')
  const css = read('../src/style.css')
  const identity = read('../src/identity.css')
  assert.match(identity, /min-width:48px/)
  assert.match(identity, /min-height:48px/)
  assert.match(identity, /\.tokenStrip\{[\s\S]*place-items:center/)
  assert.match(identity, /\.miseSectionHead #addMise\{background:var\(--ink\)/)
  assert.match(identity, /stroke:var\(--brand-outline\)/)
  assert.match(css, /justify-content:center;text-align:center/)
  assert.match(main, /© Cédric Carboni/)
  assert.ok(main.indexOf('id="searchResults"') < main.indexOf('fieldShortcuts'))
  assert.match(main, /navigator\.onLine\?'':'Hors ligne · données locales'/)
  assert.match(css, /html\[data-native-safe\] \.miseBrand\{margin-top:\.5rem\}/)
  assert.match(css, /white-space:nowrap/)
  assert.doesNotMatch(main, /Code & création|Une création de/)
})
