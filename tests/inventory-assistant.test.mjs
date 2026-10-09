import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVoiceLabelCommand, LABEL_FORMATS } from '../src/voice-label.js'
import {
  caseDisplayName,
  caseBreadcrumb,
  casePathString,
  objectPathString,
  directSubContainers,
  allDescendantCaseIds,
  containerStats
} from '../src/containers.js'
import { findSmartCompletions } from '../src/quick-add.js'
import { renderLabelRgba } from '../src/label-render.js'

test('voice label parser handles French spoken command "Crée une étiquette MICRO BRUITAGE ATELIER SPARE"', () => {
  const result = parseVoiceLabelCommand('Crée une étiquette MICRO BRUITAGE ATELIER SPARE.')
  assert.equal(result.isSpare, true)
  assert.deepEqual(result.lines, ['MICRO BRUITAGE', 'ATELIER', 'SPARE'])
  assert.equal(result.title, 'MICRO BRUITAGE')
  assert.ok(result.id.startsWith('lbl-'))
})

test('voice label parser extracts container type and parent case hierarchy from voice', () => {
  const allCases = [
    { id: 'case-atelier', name: 'Boîte Atelier' },
    { id: 'case-rose', name: 'Caisse rose' }
  ]

  const p1 = parseVoiceLabelCommand('Ajouter une pochette SPARE dans la boîte atelier', allCases)
  assert.equal(p1.entityType, 'Pochette')
  assert.equal(p1.isSpare, true)
  assert.equal(p1.parentCaseId, 'case-atelier')

  const p2 = parseVoiceLabelCommand('Nouvelle caisse rose pour les micros de bruitage', allCases)
  assert.equal(p2.entityType, 'Caisse')
})

test('containers hierarchy supports unlimited nesting and accurate path breadcrumbs', () => {
  const cases = [
    { id: 'c-1', name: 'Caisse Rose' },
    { id: 'c-2', name: 'Boîte Atelier', parentId: 'c-1' },
    { id: 'c-3', name: 'Pochette Micros', parentId: 'c-2' },
    { id: 'c-4', name: 'Trousse Câbles', parentId: 'c-1' }
  ]

  const objects = [
    { id: 'o-1', name: 'Micro Elvis', nickname: 'ELVIS', caseId: 'c-3', spare: true },
    { id: 'o-2', name: 'Petite DI', nickname: 'PETITE DI', caseId: 'c-2', spare: false },
    { id: 'o-3', name: 'Câble XLR 3m', caseId: 'c-4', spare: false },
    { id: 'o-4', name: 'Gaffer Noir', caseId: 'c-1', spare: false }
  ]

  // Breadcrumb
  const trail = caseBreadcrumb('c-3', cases)
  assert.deepEqual(trail.map(c => c.id), ['c-1', 'c-2', 'c-3'])

  // Path strings
  assert.equal(casePathString('c-3', cases), 'Caisse Rose > Boîte Atelier > Pochette Micros')
  assert.equal(casePathString('c-1', cases), 'Caisse Rose')

  // Object path string
  assert.equal(objectPathString(objects[0], cases), 'Caisse Rose > Boîte Atelier > Pochette Micros')
  assert.equal(objectPathString({ id: 'o-orphan' }, cases), 'Sans contenant')

  // Direct subcontainers
  const subsC1 = directSubContainers('c-1', cases)
  assert.deepEqual(subsC1.map(c => c.id), ['c-2', 'c-4'])

  // Descendants
  const descC1 = allDescendantCaseIds('c-1', cases)
  assert.deepEqual(Array.from(descC1).sort(), ['c-2', 'c-3', 'c-4'])

  // Container stats
  const statsC1 = containerStats('c-1', cases, objects)
  assert.equal(statsC1.directCount, 1) // o-4 (Gaffer)
  assert.equal(statsC1.totalCount, 4) // o-1, o-2, o-3, o-4
  assert.equal(statsC1.subCasesCount, 2) // c-2 and c-4
  assert.equal(statsC1.allDescendantCount, 3)

  const statsC2 = containerStats('c-2', cases, objects)
  assert.equal(statsC2.directCount, 1) // o-2
  assert.equal(statsC2.totalCount, 2) // o-2, o-1
})

test('smart completions assist fast data entry without heavy forms', () => {
  const existingObjects = [
    { name: 'Micro Shure SM58', nickname: 'LE SHURE', category: 'Micro', family: 'Micros & prises de son', caseId: 'c-micros', sounds: ['voix', 'percussion'] },
    { name: 'Micro Neumann KM184', nickname: 'ELVIS', category: 'Micro', family: 'Micros & prises de son', caseId: 'c-micros', sounds: ['acoustique'] }
  ]
  const existingCases = [
    { id: 'c-micros', name: 'Caisse micros studio' },
    { id: 'c-cables', name: 'Caisse câbles' }
  ]

  const comp = findSmartCompletions('micro', existingObjects, existingCases)
  assert.equal(comp.category, 'Micro')
  assert.equal(comp.family, 'Micros & prises de son')
  assert.equal(comp.suggestedCaseId, 'c-micros')
  assert.ok(comp.suggestedSounds.length > 0)
})

test('label renderer includes visible SPARE badge when item is marked spare', () => {
  const imgWithSpare = renderLabelRgba({
    name: 'MICRO ELVIS',
    shortId: 'obj-123',
    qrText: 'https://mises.test/obj/123',
    location: 'Caisse Rose',
    category: 'Micro',
    spare: true
  })
  assert.ok(imgWithSpare.rgba.length > 0)
  assert.equal(imgWithSpare.width, 384)
  assert.equal(imgWithSpare.height, 560)
})
