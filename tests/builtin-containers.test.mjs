import test from 'node:test'
import assert from 'node:assert/strict'
import { BUILTIN_CONTAINERS, mergeLabelContainers } from '../src/builtin-containers.js'
import { renderContainerLabelRgba, containerQrUrl } from '../src/label-render.js'

test('6 contenants intégrés : ID + nom uniquement, IDs uniques', () => {
  assert.equal(BUILTIN_CONTAINERS.length, 6)
  assert.equal(new Set(BUILTIN_CONTAINERS.map(c => c.id)).size, 6)
  for (const c of BUILTIN_CONTAINERS) assert.deepEqual(Object.keys(c).sort(), ['builtin', 'id', 'name', 'type'])
})
test('fusion par ID : pas de doublon, nom local choisi prioritaire, nom = ID remplacé', () => {
  const local = [{ id: 'SAC-NOIR-TECH-01', name: 'Mon grand sac' }, { id: 'SAC-MICRO-02', name: 'SAC-MICRO-02' }, { id: 'case-x', name: 'Valise fictive' }]
  const all = mergeLabelContainers(local)
  assert.equal(all.length, 3 + 4)
  assert.equal(all.filter(c => c.id === 'SAC-NOIR-TECH-01').length, 1)
  assert.equal(all.find(c => c.id === 'SAC-NOIR-TECH-01').name, 'Mon grand sac')
  assert.equal(all.find(c => c.id === 'SAC-MICRO-02').name, 'PETIT SAC TECHNIQUE · MICRO')
  assert.equal(mergeLabelContainers([]).length, 6)
})
test('étiquettes intégrées : QR = URL publique ?case=<id>', () => {
  for (const c of BUILTIN_CONTAINERS) assert.equal(renderContainerLabelRgba({ id: c.id, name: c.name, subtitle: c.id }).qrText, containerQrUrl(c.id))
})
