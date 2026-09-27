import test from 'node:test'
import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { emptyData } from '../src/data-bruitage.js'
import { closestFiches, correctionKey, genericCategory, matchDetections, searchFiches } from '../src/vision-matching.js'
import { newLearning } from '../src/learning.js'
import { inkFromSettings, inkSetting } from '../src/ink.js'

const OLD_FRENCH = {
  bottle: 'bouteille', cup: 'tasse', 'wine glass': 'verre', chair: 'chaise', scissors: 'ciseaux',
  book: 'livre', bowl: 'bol', bicycle: 'vélo', 'dining table': 'table'
}

function sheet() {
  const data = emptyData()
  data.objects.push(
    { id: 'obj-bidon', name: 'Bidon souple', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-flacon', name: 'Flacon de scène', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-gourde', name: 'Gourde de tournée', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-frappee', name: 'Bouteille frappée', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-chaine', name: 'Chaîne moyenne', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-tasse', name: 'Tasse ébréchée', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-verre', name: 'Verre à pied', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-chaise', name: 'Chaise pliante', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-ciseaux', name: 'Ciseaux de couture', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-livre', name: 'Livre de régie', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-bol', name: 'Bol en grès', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-velo', name: 'Vélo de décor', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-table', name: 'Table de jardin', aliases: [], tags: [], sounds: [], contexts: [] }
  )
  return data
}

const PHOTOS = [
  { photo: 'bouteille-eau.jpg', detected: 'bottle', category: "bouteille d'eau", fiche: 'obj-frappee' },
  { photo: 'tasse.jpg', detected: 'cup', category: 'tasse', fiche: 'obj-tasse' },
  { photo: 'verre.jpg', detected: 'wine glass', category: 'verre', fiche: 'obj-verre' },
  { photo: 'chaise.jpg', detected: 'chair', category: 'chaise', fiche: 'obj-chaise' },
  { photo: 'ciseaux.jpg', detected: 'scissors', category: 'ciseaux', fiche: 'obj-ciseaux' },
  { photo: 'livre.jpg', detected: 'book', category: 'livre', fiche: 'obj-livre' },
  { photo: 'bol.jpg', detected: 'bowl', category: 'bol', fiche: 'obj-bol' },
  { photo: 'velo.jpg', detected: 'bicycle', category: 'vélo', fiche: 'obj-velo' },
  { photo: 'table.jpg', detected: 'dining table', category: 'table', fiche: 'obj-table' }
]

function beforeTop(proposal, data) {
  const order = new Map(data.objects.map((object, index) => [object.id, index]))
  return [...proposal.candidates].sort((a, b) => b.lexical - a.lexical || order.get(a.objectId) - order.get(b.objectId)).slice(0, 3)
}

test('a water bottle stays a generic category and the closest fiche is only a proposal', () => {
  assert.equal(genericCategory('bottle'), "bouteille d'eau")
  assert.equal(genericCategory('cup'), 'tasse')
  const data = sheet()
  const bottle = matchDetections([{ class: 'bottle', score: 0.91, bbox: [0, 0, 20, 40] }], data, '')[0]
  assert.equal(bottle.category, "bouteille d'eau")
  assert.equal(bottle.label, "bouteille d'eau")
  assert.equal(bottle.objectId, '')
  assert.equal(bottle.validated, false)
  const picks = closestFiches(bottle.candidates)
  assert.equal(picks[0].objectId, 'obj-frappee')
  assert.equal(picks.some(item => item.objectId === 'obj-chaine'), false)
  assert.equal(beforeTop(bottle, data).some(item => item.objectId === 'obj-frappee'), false)
  const found = searchFiches(data.objects, 'bottle', 'frapp')
  assert.equal(found[0].objectId, 'obj-frappee')
  assert.equal(searchFiches(data.objects, 'bottle', 'chaîne')[0].objectId, 'obj-chaine')
})

test('photo sheet: generic category and top-3 fiche, before the change and after', () => {
  const data = sheet()
  let categoryBefore = 0
  let categoryAfter = 0
  let topBefore = 0
  let topAfter = 0
  for (const row of PHOTOS) {
    const proposal = matchDetections([{ class: row.detected, score: 0.9 }], data, '')[0]
    const previous = beforeTop(proposal, data)
    const shownBefore = previous.find(item => item.lexical >= 0.7)?.name || OLD_FRENCH[row.detected]
    if (shownBefore === row.category) categoryBefore += 1
    if (proposal.category === row.category) categoryAfter += 1
    if (previous.some(item => item.objectId === row.fiche)) topBefore += 1
    if (closestFiches(proposal.candidates).some(item => item.objectId === row.fiche)) topAfter += 1
  }
  const total = PHOTOS.length
  console.log(JSON.stringify({
    photos: total,
    categoryBefore: `${categoryBefore}/${total}`,
    categoryAfter: `${categoryAfter}/${total}`,
    top3Before: `${topBefore}/${total}`,
    top3After: `${topAfter}/${total}`
  }))
  assert.equal(categoryBefore, 0)
  assert.equal(categoryAfter, total)
  assert.equal(topBefore, total - 1)
  assert.equal(topAfter, total)
})

test('a memorized correction proposes that fiche first and survives save and restore', async () => {
  const data = sheet()
  data.objects.push({ id: 'obj-perso', name: 'Contenant de scène', aliases: [], tags: [], sounds: [], contexts: [] })
  const before = matchDetections([{ class: 'bottle', score: 0.9 }], data, 'inventaire')[0]
  assert.equal(closestFiches(before.candidates).some(item => item.objectId === 'obj-perso'), false)
  const learning = newLearning({ id: 'learn-frappee', kind: 'label-preference', label: 'bottle', objectId: 'obj-frappee', context: 'inventaire' })
  const learned = matchDetections([{ class: 'bottle', score: 0.9 }], data, 'inventaire', [learning])[0]
  assert.equal(learned.objectId, 'obj-frappee')
  assert.equal(learned.label, 'Bouteille frappée')
  assert.equal(learned.category, "bouteille d'eau")
  assert.equal(learned.candidates[0].objectId, 'obj-frappee')
  assert.equal(learned.validated, false)
  assert.match(learned.evidence, /sans réentraînement/)

  const name = `cat-${crypto.randomUUID()}`
  const opened = await openDB(name, 5, { upgrade(db) {
    for (const key of ['objects', 'corrections', 'learnings', 'settings']) db.createObjectStore(key, { keyPath: 'id' })
  } })
  for (const object of data.objects) await opened.put('objects', object)
  await opened.put('corrections', { id: correctionKey('bottle', 'inventaire'), label: 'bottle', context: 'inventaire', action: 'match', objectId: 'obj-frappee', humanValidated: true })
  await opened.put('learnings', learning)
  await opened.put('settings', inkSetting('#1D4E89'))
  const payload = {
    objects: await opened.getAll('objects'),
    corrections: await opened.getAll('corrections'),
    learnings: await opened.getAll('learnings'),
    settings: await opened.getAll('settings')
  }
  opened.close()

  const restoredName = `cat-${crypto.randomUUID()}`
  const restored = await openDB(restoredName, 5, { upgrade(db) {
    for (const key of ['objects', 'corrections', 'learnings', 'settings']) db.createObjectStore(key, { keyPath: 'id' })
  } })
  for (const key of ['objects', 'corrections', 'learnings', 'settings']) {
    for (const item of payload[key]) await restored.put(key, item)
  }
  const back = emptyData()
  back.objects = await restored.getAll('objects')
  back.corrections = await restored.getAll('corrections')
  const learnings = await restored.getAll('learnings')
  const again = matchDetections([{ class: 'bottle', score: 0.88 }], back, 'inventaire', learnings)[0]
  assert.equal(again.objectId, 'obj-frappee')
  assert.equal(again.candidates[0].name, 'Bouteille frappée')
  assert.equal(again.category, "bouteille d'eau")
  assert.match(again.evidence, /contexte/)
  assert.equal(inkFromSettings(await restored.getAll('settings')), '#1D4E89')
  restored.close()
})
