import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCentralIndex, centralSearch } from '../src/central-search.js'
const data = {
  cases: [{ id: 'c1', name: 'Valise fictive' }, { id: 'c2', name: 'Pochette bleue', parentId: 'c1' }],
  objects: [
    { id: 'o1', name: 'Tôle à tonnerre', caseId: 'c2', sounds: ['tonnerre'], methods: [{ technique: 'Secouer la tôle', sound: 'tonnerre' }] },
    { id: 'o2', name: 'Cellophane', caseId: 'c1' }
  ],
  sounds: [{ id: 's1', name: 'Feu de camp' }],
  objectSounds: [{ object_id: 'o2', sound_id: 's1', technique: 'Froisser lentement' }, { object_id: 'o1', sound_id: 's1' }]
}
const idx = buildCentralIndex(data)
test('objet trouvé avec techniques et chemin du contenant', () => {
  const r = centralSearch(idx, 'tole')[0]
  assert.equal(r.kind, 'objet'); assert.equal(r.id, 'o1')
  assert.match(r.path, /Valise fictive.*Pochette bleue/)
  assert.deepEqual(r.techniques, ['Secouer la tôle'])
})
test('bruitage many-to-many : plusieurs objets', () => {
  const r = centralSearch(idx, 'feu de camp').find(x => x.kind === 'bruitage')
  assert.deepEqual(r.objects.map(o => o.id).sort(), ['o1', 'o2'])
  assert.deepEqual(r.techniques, ['Froisser lentement'])
})
test('technique et contenant trouvables', () => {
  assert.equal(centralSearch(idx, 'froisser')[0].kind, 'technique')
  const c = centralSearch(idx, 'pochette').find(x => x.kind === 'contenant')
  assert.equal(c.id, 'c2'); assert.deepEqual(c.objects.map(o => o.id), ['o1'])
  assert.deepEqual(centralSearch(idx, '  '), [])
})
