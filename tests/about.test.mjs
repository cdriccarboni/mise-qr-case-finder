import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACOUSMATIC_THEATRE_URL, AUTHOR_WEBSITE_URL, externalAnchor } from '../src/about.js'

test('the author website stays hidden until a real address is provided', () => {
  assert.equal(AUTHOR_WEBSITE_URL, '')
  assert.equal(externalAnchor(AUTHOR_WEBSITE_URL, 'Site de Cédric Carboni', 'data-author'), '')
  assert.equal(ACOUSMATIC_THEATRE_URL, 'https://www.acousmatic-theatre.fr/')
  const anchor = externalAnchor(ACOUSMATIC_THEATRE_URL, 'Acousmatic Theatre')
  assert.match(anchor, /href="https:\/\/www\.acousmatic-theatre\.fr\/"/)
  assert.match(anchor, /target="_blank"/)
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
  assert.match(main, /MISE ! — Une création de Cédric Carboni pour Acousmatic Theatre/)
  assert.match(main, /AUTHOR_WEBSITE_URL/)
})
