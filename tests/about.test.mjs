import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACOUSMATIC_THEATRE_URL, AUTHOR_WEBSITE_URL, PRIVACY_URL, REPOSITORY_URL, externalAnchor } from '../src/about.js'

const AUTHOR_URL = 'https://carboni-cedric.pages-perso.free.fr/'

test('the about screen keeps the author copyright link and public project URLs', () => {
  assert.equal(AUTHOR_WEBSITE_URL, AUTHOR_URL)
  assert.equal(ACOUSMATIC_THEATRE_URL, 'https://www.acousmatic-theatre.fr/')
  assert.equal(REPOSITORY_URL, 'https://github.com/cdriccarboni/mise-qr-case-finder')
  assert.equal(PRIVACY_URL, 'https://cdriccarboni.github.io/mise-qr-case-finder/privacy.html')
  assert.equal(externalAnchor('', 'Cédric Carboni', 'data-author'), '')
  const author = externalAnchor(AUTHOR_WEBSITE_URL, 'Cédric Carboni', 'data-author')
  assert.match(author, /href="https:\/\/carboni-cedric\.pages-perso\.free\.fr\/"/)
  assert.match(author, /target="_blank"/)
  assert.match(author, /data-author/)
  const theatre = externalAnchor(ACOUSMATIC_THEATRE_URL, 'Acousmatic Theatre')
  assert.match(theatre, /href="https:\/\/www\.acousmatic-theatre\.fr\/"/)
  assert.match(theatre, /target="_blank"/)
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
  assert.match(main, /<p class="aboutCredit">© \$\{externalAnchor\(AUTHOR_WEBSITE_URL, 'Cédric Carboni'/)
  assert.match(main, /<span>© Cédric Carboni<\/span>/)
  assert.doesNotMatch(main, /Une création de|pour \$\{externalAnchor\(ACOUSMATIC_THEATRE_URL/)
  assert.doesNotMatch(main, /id="aboutHome"/)
  assert.doesNotMatch(main, /id="goalAbout"/)
  assert.match(main, /id="preferencesAbout"/)
})
