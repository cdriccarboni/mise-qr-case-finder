import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { emptyData } from '../src/data-bruitage.js'
import { analyseMise, closestFiches, genericCategory, matchDetections, PHOTO_ANALYSIS_UNAVAILABLE, PHOTO_PROPOSAL_HINT, photoProposalStatus } from '../src/vision-matching.js'

function stock() {
  const data = emptyData()
  data.objects.push(
    { id: 'obj-valise', name: 'Valise cabine', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-malle', name: 'Malle de tournée', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-chaise', name: 'Chaise pliante', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-fauteuil', name: 'Fauteuil club', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-table', name: 'Table de jardin', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-bureau', name: 'Bureau de régie', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-chaine', name: 'Chaîne moyenne', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-sac', name: 'Sac de voyage', aliases: [], tags: [], sounds: [], contexts: [] }
  )
  data.cases.push({ id: 'case-grise', name: 'Caisse grise n°23' })
  return data
}

test('a real word proposes that fiche, and a loose synonym stays behind', () => {
  const data = stock()
  const suitcase = matchDetections([{ class: 'suitcase', score: 0.91, bbox: [4, 8, 40, 30] }], data, 'caisse')[0]
  assert.equal(suitcase.validated, false)
  assert.equal(suitcase.objectId, '')
  assert.equal(suitcase.category, 'valise')
  assert.equal(suitcase.label, 'valise')
  assert.equal(suitcase.candidates[0].objectId, 'obj-valise')
  assert.equal(suitcase.candidates[0].tight, true)
  const picks = closestFiches(suitcase.candidates)
  assert.deepEqual(picks.map(item => item.objectId), ['obj-valise'])
  assert.equal(picks.some(item => item.objectId === 'obj-chaine' || item.objectId === 'obj-sac' || item.objectId === 'obj-malle'), false)
  assert.match(suitcase.evidence, /fiches proches/)
  assert.match(suitcase.evidence, /pas une identification certaine/)

  const chair = matchDetections([{ class: 'chair', score: 0.87, bbox: [10, 10, 30, 40] }], data, '')[0]
  assert.equal(chair.validated, false)
  assert.equal(chair.objectId, '')
  assert.equal(closestFiches(chair.candidates).map(item => item.objectId).join(','), 'obj-chaise')
  assert.equal(chair.candidates.some(item => item.objectId === 'obj-fauteuil'), true)
  assert.equal(closestFiches(chair.candidates).some(item => item.objectId === 'obj-fauteuil'), false)
})

test('an unknown object, a person and a generic class do not invent a fiche', () => {
  const data = stock()
  const photo = matchDetections([
    { class: 'person', score: 0.99, bbox: [0, 0, 80, 120] },
    { class: 'toaster', score: 0.82, bbox: [90, 20, 30, 30] },
    { class: 'suitcase', score: 0.9, bbox: [4, 8, 40, 30] },
    { class: 'chair', score: 0.8, bbox: [50, 40, 28, 36] }
  ], data, 'régie')
  assert.equal(photo.some(item => item.rawLabel === 'person'), false)
  assert.equal(photo.length, 3)
  const unknown = photo.find(item => item.rawLabel === 'toaster')
  assert.equal(genericCategory('toaster'), 'objet non reconnu')
  assert.equal(unknown.label, 'objet non reconnu')
  assert.equal(unknown.objectId, '')
  assert.equal(unknown.validated, false)
  assert.equal(unknown.candidates.length, 0)
  assert.match(unknown.evidence, /aucune correspondance/)
  assert.equal(unknown.candidates.some(item => item.objectId === 'obj-chaine'), false)

  const broad = matchDetections([{ class: 'dining table', score: 0.93 }], data, '')[0]
  assert.equal(broad.validated, false)
  assert.equal(broad.objectId, '')
  assert.deepEqual(closestFiches(broad.candidates).map(item => item.objectId), ['obj-table'])
  assert.equal(broad.candidates.some(item => item.objectId === 'obj-bureau' || item.objectId === 'obj-chaise'), false)

  const onlyChair = emptyData()
  onlyChair.objects.push({ id: 'obj-chaise', name: 'Chaise pliante', aliases: [], tags: [], sounds: [], contexts: [] })
  onlyChair.objects.push({ id: 'obj-bureau', name: 'Bureau de régie', aliases: [], tags: [], sounds: [], contexts: [] })
  const generic = matchDetections([{ class: 'dining table', score: 0.77 }], onlyChair, 'pluie')[0]
  assert.equal(generic.candidates.length, 0)
  assert.equal(generic.objectId, '')
  assert.match(generic.evidence, /aucune correspondance/)

  const mise = { objectIds: ['obj-valise', 'obj-chaise'], checked: [] }
  const analysis = analyseMise(mise, photo)
  assert.deepEqual(analysis.present, [])
  assert.equal(photo.every(item => item.validated === false), true)
})

test('the photo screen says this is a proposal, in plain French', () => {
  const status = photoProposalStatus(2)
  const blob = `${PHOTO_PROPOSAL_HINT}\n${status}\n${photoProposalStatus(0)}\n${PHOTO_ANALYSIS_UNAVAILABLE}`
  assert.match(status, /2 objet\(s\) proposés localement/)
  assert.match(status, /2 zone\(s\) proposée\(s\)/)
  assert.match(blob, /pas une identification certaine/)
  assert.match(blob, /sans votre confirmation|tant que vous n’avez pas confirmé/)
  assert.doesNotMatch(blob, /PWA|COCO|embedding|MobileNet|IDENTIFIÉ/i)
  const ui = readFileSync(new URL('../src/vision-ui.js', import.meta.url), 'utf8')
  assert.match(ui, /photoProposalStatus\(matches\.length\)/)
  assert.match(ui, /PHOTO_PROPOSAL_HINT/)
  assert.match(ui, /data-confirm type="checkbox"/)
  assert.match(ui, /p\.validated && !p\.rejected/)
  assert.doesNotMatch(ui, /PWA|COCO|embedding|MobileNet|IDENTIFIÉ/)
  assert.doesNotMatch(ui, /data-confirm type="checkbox" checked/)
})
