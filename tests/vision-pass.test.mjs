import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyData } from '../src/data-bruitage.js'
import { fuseDetections, intersectionOverUnion, mapDetection, planPasses } from '../src/vision-pass.js'
import { matchDetections } from '../src/vision-matching.js'

test('passes cover the whole frame, a closer crop and a quarter turn', () => {
  const passes = planPasses(400, 300)
  assert.equal(passes[0].name, 'entier')
  assert.ok(passes.some(item => item.name === 'zoom' && item.scale > 1))
  assert.equal(passes.filter(item => item.name.startsWith('tuile-')).length, 4)
  assert.equal(passes.at(-1).rotation, 90)
  const tiles = passes.filter(item => item.name.startsWith('tuile-'))
  for (const tile of tiles) {
    assert.ok(tile.x >= -0.01 && tile.y >= -0.01)
    assert.ok(tile.x + tile.w <= 400.01)
    assert.ok(tile.y + tile.h <= 300.01)
  }
})

test('a clockwise box returns to the original photo, and overlapping copies collapse', () => {
  const pass = { name: 'rotation', x: 0, y: 0, w: 100, h: 40, scale: 1, rotation: 90 }
  const mapped = mapDetection({ class: 'cup', score: 0.5, bbox: [0, 0, 10, 10] }, pass, 100, 40)
  assert.deepEqual(mapped.bbox.map(value => Math.round(value)), [0, 30, 10, 10])
  const zoom = { name: 'zoom', x: 20, y: 10, w: 40, h: 40, scale: 2, rotation: 0 }
  const scaled = mapDetection({ class: 'cup', score: 0.4, bbox: [4, 6, 8, 10] }, zoom, 100, 80)
  assert.deepEqual(scaled.bbox, [22, 13, 4, 5])
  assert.ok(intersectionOverUnion([0, 0, 10, 10], [1, 1, 10, 10]) > 0.45)
  const fused = fuseDetections([
    { class: 'cup', score: 0.5, bbox: [0, 0, 20, 20], pass: 'entier' },
    { class: 'cup', score: 0.4, bbox: [2, 2, 18, 18], pass: 'tuile-00' },
    { class: 'book', score: 0.19, bbox: [80, 80, 10, 10], pass: 'tuile-11' },
    { class: 'vase', score: 0.8, bbox: [1, 1, 18, 18], pass: 'zoom' },
    { class: 'spoon', score: 0.7, bbox: [60, 60, 8, 8], pass: 'zoom' }
  ])
  assert.equal(fused.filter(item => item.class === 'cup').length, 1)
  assert.equal(fused.find(item => item.class === 'cup').support, 2)
  assert.equal(fused.some(item => item.class === 'book'), false)
  assert.equal(fused.some(item => item.class === 'vase'), false)
  assert.equal(fused.some(item => item.class === 'spoon'), true)
})

test('a detected label proposes the closest fiche, not the raw English word', () => {
  const data = emptyData()
  data.objects.push(
    { id: 'obj-gourde', name: 'Gourde froissable fictive', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-chaine', name: 'Chaîne moyenne', aliases: [], tags: [], sounds: [], contexts: [] },
    { id: 'obj-verre', name: 'Verre à pied', aliases: [], tags: [], sounds: [], contexts: [] }
  )
  const bottle = matchDetections([{ class: 'bottle', score: 0.8, bbox: [0, 0, 8, 8] }], data, '')[0]
  assert.equal(bottle.objectId, 'obj-gourde')
  assert.equal(bottle.label, 'Gourde froissable fictive')
  assert.equal(bottle.validated, false)
  assert.match(bottle.evidence, /synonyme/)
  const glass = matchDetections([{ class: 'wine glass', score: 0.7 }], data, '')[0]
  assert.equal(glass.objectId, 'obj-verre')
  const lonely = emptyData()
  lonely.objects.push({ id: 'obj-verre', name: 'Verre à pied', aliases: [], tags: [], sounds: [] })
  const near = matchDetections([{ class: 'cup', score: 0.66 }], lonely, '')[0]
  assert.equal(near.objectId, '')
  assert.equal(near.label, 'tasse')
  assert.equal(near.candidates[0].name, 'Verre à pied')
  assert.match(near.evidence, /objet proche/)
  const chair = matchDetections([{ class: 'chair', score: 0.9 }], data, 'pluie')[0]
  assert.equal(chair.objectId, '')
  assert.match(chair.evidence, /aucune correspondance/)
})
