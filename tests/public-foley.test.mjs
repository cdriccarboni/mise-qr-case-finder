import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  publicReferenceIdeas, publicRecordsForOwned, randomPublicUniverse,
  generatePublicGame, publicActivityProgram
} from '../src/public-foley.js'

const library = JSON.parse(readFileSync(new URL('../public/public-foley.json', import.meta.url), 'utf8'))

test('public payload is scoped to PUBLIC_WEB and contains no private provenance', () => {
  assert.equal(library.publicationScope, 'PUBLIC_WEB')
  assert.equal(library.records.length, 99)
  assert.ok(library.fabrications.length >= 12)
  assert.ok(library.games.length >= 8)
  assert.ok(library.pedagogyActivities.length >= 7)
  const raw = JSON.stringify(library)
  assert.doesNotMatch(raw, /PRIVE_ONLY|PRIVE_UTILISATEUR|MIXTE_PRIVE_WEB/)
  assert.ok(library.records.every(row => /^https?:\/\//.test(row.sourceUrl)))
})

test('public references retain source URLs', () => {
  const refs = publicReferenceIdeas(library)
  assert.equal(refs.length, library.records.length)
  assert.ok(refs.every(ref => ref.publicationScope === 'PUBLIC_WEB'))
  assert.ok(refs.every(ref => /^https?:\/\//.test(ref.sourceUrl)))
})

test('owned matching never marks a public reference as owned by itself', () => {
  const objects = [{ id: 'obj-gloves', name: 'Gants en cuir', owned: true, status: 'available' }]
  const matched = publicRecordsForOwned(library, objects)
  assert.ok(matched.length >= 1)
  assert.ok(matched.every(row => row.ownedMatches.length >= 1))
  assert.ok(matched.every(row => row.ownedMatches.every(hit => hit.id === 'obj-gloves')))
})

test('public inventory-only game only uses matched real object ids', () => {
  const objects = [{ id: 'obj-gloves', name: 'Gants en cuir', owned: true, status: 'available' }]
  const game = generatePublicGame(library, objects, { gameId: 'public-inventory-only', rng: () => 0 })
  assert.ok(game)
  assert.equal(game.publicationScope, 'PUBLIC_WEB')
  assert.deepEqual(game.objectIds, ['obj-gloves'])
  assert.ok(/^https?:\/\//.test(game.solution.source))
})

test('random universe is generated from sourced records', () => {
  const universe = randomPublicUniverse(library, [], { rng: () => 0 })
  assert.ok(universe)
  assert.ok(universe.records.length >= 1)
  assert.ok(universe.records.every(row => /^https?:\/\//.test(row.sourceUrl)))
})

test('pedagogy program composes games from the public library', () => {
  const program = publicActivityProgram(library, [], 30, { rng: () => 0 })
  assert.ok(program.activities.length >= 1)
  assert.ok(program.totalMinutes <= 30)
  assert.equal(program.source, 'PUBLIC_WEB')
})

test('main exposes the two interface modes and custom categories', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
  assert.match(main, /Bruitages & pédagogie/)
  assert.match(main, /Inventaire \/ régie/)
  assert.match(main, /CUSTOM_CATEGORIES_KEY/)
  assert.match(main, /Bibliothèque publique/)
  assert.match(main, /Fabrications/)
  assert.match(main, /Activités pédagogiques/)
})
