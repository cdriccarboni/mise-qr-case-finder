import test from 'node:test'
import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { DATA_STORES, emptyData } from '../src/data-bruitage.js'
import { matchDetections, correctionKey } from '../src/vision-matching.js'
import { renderLabelRgba } from '../src/label-render.js'
import { decodeQrImage } from './decode-qr.mjs'
import { entityUrl, readEntityUrl, shortId } from '../src/qr-link.js'
import { proposeVibe } from '../src/vibe-engine.js'
import { generateExercises, handsChallenges, sightUniverses } from '../src/exercise-engine.js'
import { parseIntent, answerIntent } from '../src/conversation.js'
import { newLearning } from '../src/learning.js'

const chain = { id: 'obj-chaine', name: 'Chaîne moyenne', hear: 'cliquetis', imagine: 'gréement', family: 'Musique & percussions', caseId: 'case-grise', sounds: ['chaîne'], aliases: [], tags: ['port'], owned: true }
const grey = { id: 'case-grise', name: 'Caisse grise n°23' }

test('a printed label QR decodes back to the same entity', () => {
  const qrText = entityUrl('https://exemple.invalid/mise/', 'case', grey.id)
  const image = renderLabelRgba({ name: grey.name, shortId: shortId(grey.id), qrText, location: 'Caisse', category: 'Contenant' })
  const decoded = decodeQrImage(image)
  assert.equal(decoded, qrText)
  assert.equal(readEntityUrl(decoded).caseId, grey.id)
  assert.equal(image.rgba.length, image.width * image.height * 4)
})

test('vibe prefers an owned object and its location, and keeps public techniques apart', () => {
  const result = proposeVibe('Une forêt inquiétante la nuit avec quelque chose qui rôde au loin', [chain], [grey], [])
  assert.equal(result.offline, true)
  assert.equal(result.engine, 'lexique-local')
  const owned = result.proposals.flatMap(item => item.lines)
  assert.ok(owned.some(line => line.owned && line.label === 'Chaîne moyenne — Caisse grise n°23'))
  assert.ok(result.ifYouHave.every(item => item.owned === false))
  assert.ok(result.ifYouHave.some(item => item.source === 'Bibliothèque publique de techniques'))
  const empty = proposeVibe('Une forêt inquiétante la nuit', [], [], [])
  assert.equal(empty.proposals.flatMap(item => item.lines).length, 0)
  assert.ok(empty.ifYouHave.length > 0)
})

test('the asked French questions separate owned, suggested and uncertain', () => {
  const objects = [chain, { id: 'obj-noix', name: 'Coquilles de noix fictives', hear: 'sabots', imagine: 'cheval', caseId: 'case-grise', sounds: [], aliases: [], tags: [] }]
  const cases = [grey]
  const mises = [{ id: 'mise-soir', name: 'Mise de ce soir', objectIds: ['obj-chaine', 'obj-noix'], checked: ['obj-chaine'] }]
  const where = answerIntent(parseIntent('Où est mon truc pour faire le tonnerre ?'), { objects: [{ ...chain, hear: 'tonnerre lointain' }], cases })
  assert.equal(where.owned[0].location, 'Caisse grise n°23')
  assert.equal(where.owned[0].owned, true)
  const inside = answerIntent(parseIntent('Qu’est-ce que j’ai dans la caisse grise n°23 ?'), { objects, cases })
  assert.equal(inside.owned.length, 2)
  const ways = answerIntent(parseIntent('Trouve-moi trois façons de faire des sabots de cheval'), { objects, cases })
  assert.equal(ways.type, 'ways')
  assert.ok(ways.owned.some(item => item.owned && item.title === 'Coquilles de noix fictives'))
  const scoped = answerIntent(parseIntent('J’ai uniquement la caisse grise n°23 avec moi : comment faire une ambiance de port ?'), { objects, cases })
  assert.ok(scoped.lead.includes('Caisse grise n°23'))
  assert.ok(scoped.owned.every(item => item.location === 'Caisse grise n°23'))
  const missing = answerIntent(parseIntent('Quels objets me manquent pour la mise de ce soir ?'), { objects, cases, mises, activeMise: 'mise-soir' })
  assert.deepEqual(missing.owned.map(item => item.title), ['Coquilles de noix fictives'])
  const scan = answerIntent(parseIntent('Scanne ce qu’il y a devant moi et propose-moi un exercice de cinq minutes'), {})
  assert.equal(scan.action, 'scan-exercise')
  assert.equal(scan.minutes, 5)
  const house = answerIntent(parseIntent('Donne-moi quatre manières différentes de faire entendre une vieille maison'), { objects, cases })
  assert.equal(house.vibe.universe.id, 'vieille-maison')
  const rain = answerIntent(parseIntent('Avec quoi je peux faire un bruit de pluie ?'), { objects: [], cases: [] })
  assert.equal(rain.owned.length, 0)
  assert.ok(rain.suggested.length > 0)
  assert.ok(rain.suggested.every(item => item.owned === false))
  assert.equal(parseIntent('glouglou fictif'), null)
  assert.equal(parseIntent('tempête imaginée fictive'), null)
})

test('exercises and hands challenges use only the given objects', () => {
  const pack = generateExercises({ objects: [{ name: 'Verre' }, { name: 'Cuillère' }], durationMin: 0.5, participants: 2, level: 'avancé', count: 10 })
  assert.ok(pack.exercises.length >= 4)
  for (const item of pack.exercises) {
    assert.equal(item.provenance, 'generated')
    assert.match(item.disclaimer, /pas une fiche/)
    const blob = JSON.stringify(item)
    assert.equal(/violon|piano|guitare/i.test(blob), false)
    for (const used of item.objectsUsed) assert.ok(['Verre', 'Cuillère'].includes(used))
  }
  const hands = handsChallenges(['verre', 'cuillère', 'clés'])
  assert.equal(hands.challenges.length, 4)
  assert.match(hands.challenges.map(item => item.steps.join(' ')).join(' '), /verre/)
  assert.equal(/violon/.test(JSON.stringify(hands)), false)
  const sight = sightUniverses(['bouteille'])
  assert.equal(sight.intro, 'Avec ce que je vois, voici quelques univers que tu pourrais essayer')
  assert.ok(sight.scenarios.every(scene => scene.steps.join(' ').includes('bouteille') && scene.owned === false))
  assert.equal(handsChallenges([]).challenges.length, 0)
  assert.equal(generateExercises({ objects: [] }).exercises.length, 0)
})

test('a validated learning changes the next proposal and can be reversed without touching the fiche', () => {
  const data = emptyData()
  data.objects.push({ id: 'obj-bouteille', name: 'Chaîne moyenne fictive', aliases: [], tags: [], sounds: [], contexts: [] })
  const before = matchDetections([{ class: 'bottle', score: .9, bbox: [0, 0, 8, 8] }], data, 'inventaire')
  assert.equal(before[0].objectId, '')
  const learning = newLearning({ kind: 'label-preference', label: 'bottle', objectId: 'obj-bouteille' })
  const after = matchDetections([{ class: 'bottle', score: .9 }], data, 'inventaire', [learning])
  assert.equal(after[0].objectId, 'obj-bouteille')
  assert.equal(after[0].validated, false)
  assert.match(after[0].evidence, /sans réentraînement/)
  learning.active = false
  assert.equal(matchDetections([{ class: 'bottle', score: .9 }], data, 'autre', [learning])[0].objectId, '')
  data.corrections.push({ id: correctionKey('bottle', 'atelier'), label: 'bottle', context: 'atelier', action: 'match', objectId: 'obj-bouteille' })
  assert.equal(matchDetections([{ class: 'bottle', score: .9 }], data, 'atelier')[0].evidence.includes('contexte'), true)
  assert.equal(matchDetections([{ class: 'person', score: .99 }, { class: 'bottle', score: .5 }], data, '', [learning]).length, 1)
})

test('indexeddb v4 records survive the learnings store upgrade', async () => {
  const name = `mig-${crypto.randomUUID()}`
  const opened = await openDB(name, 4, { upgrade(db) { for (const key of [...DATA_STORES, 'kits', 'settings']) db.createObjectStore(key, { keyPath: 'id' }) } })
  await opened.put('objects', { id: 'keep-me', name: 'Objet à conserver', hear: 'tic', imagine: 'tac' })
  await opened.put('cases', { id: 'case-keep', name: 'Caisse grise n°23' })
  opened.close()
  const upgraded = await openDB(name, 5, { upgrade(db) {
    for (const key of [...DATA_STORES, 'kits', 'settings', 'learnings']) if (!db.objectStoreNames.contains(key)) db.createObjectStore(key, { keyPath: 'id' })
  } })
  assert.equal((await upgraded.get('objects', 'keep-me')).imagine, 'tac')
  assert.equal((await upgraded.get('cases', 'case-keep')).name, 'Caisse grise n°23')
  await upgraded.put('learnings', newLearning({ id: 'learn-1', kind: 'label-preference', label: 'bottle', objectId: 'keep-me' }))
  const stored = await upgraded.get('learnings', 'learn-1')
  stored.active = false
  await upgraded.put('learnings', stored)
  assert.equal((await upgraded.get('learnings', 'learn-1')).active, false)
  assert.equal((await upgraded.get('objects', 'keep-me')).name, 'Objet à conserver')
  upgraded.close()
})
