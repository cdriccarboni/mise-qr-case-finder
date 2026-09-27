import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACOUSMATIC_THEATRE_URL, AUTHOR_WEBSITE_URL, externalAnchor } from '../src/about.js'

const AUTHOR_URL = 'https://carboni-cedric.pages-perso.free.fr/'

test('the about screen links to Acousmatic Theatre and to the author site', () => {
  assert.equal(AUTHOR_WEBSITE_URL, AUTHOR_URL)
  assert.equal(ACOUSMATIC_THEATRE_URL, 'https://www.acousmatic-theatre.fr/')
  assert.equal(externalAnchor('', 'Site de Cédric Carboni', 'data-author'), '')
  const author = externalAnchor(AUTHOR_WEBSITE_URL, 'Site de Cédric Carboni', 'data-author')
  assert.match(author, /href="https:\/\/carboni-cedric\.pages-perso\.free\.fr\/"/)
  assert.match(author, /target="_blank"/)
  assert.match(author, /data-author/)
  assert.doesNotMatch(author, /http:\/\/carboni\.cedric\.free\.fr/)
  const theatre = externalAnchor(ACOUSMATIC_THEATRE_URL, 'Acousmatic Theatre')
  assert.match(theatre, /href="https:\/\/www\.acousmatic-theatre\.fr\/"/)
  assert.match(theatre, /target="_blank"/)
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
  const about = readFileSync(new URL('../src/about.js', import.meta.url), 'utf8')
  assert.match(main, /MISES ! — Une création de Cédric Carboni pour Acousmatic Theatre/)
  assert.match(main, /AUTHOR_WEBSITE_URL/)
  assert.doesNotMatch(about, /http:\/\/carboni\.cedric\.free\.fr/)
  assert.doesNotMatch(main, /http:\/\/carboni\.cedric\.free\.fr/)
})
