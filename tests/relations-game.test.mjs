import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRelationGraph, summarizeInventory, isObjectAvailable, foleysPlayable, availableObjectIds, completeMethods } from '../src/relations.js'
import { generateChallenge, generateWorkshop } from '../src/game-engine.js'
import { DATA_LAYER } from '../src/relations.js'
import { rememberGameEvent, loadGameHistory } from '../src/game-history.js'

const base = () => {
  const objects = [
    { id: 'obj-a', name: 'Chaîne', hear: 'cliquetis', imagine: 'gréement', sounds: ['cliquetis'], caseId: 'case-1', owned: true, status: 'available', tags: ['port', 'bateau'] },
    { id: 'obj-b', name: 'Papier', hear: 'froissement', imagine: 'feuilles', sounds: ['froissement', 'feu'], caseId: 'case-1', owned: true, status: 'available', tags: ['foret'] },
    { id: 'obj-c', name: 'Bouteille', hear: 'glouglou', sounds: ['glouglou'], caseId: 'case-2', owned: true, status: 'available', tags: ['eau'] },
    { id: 'obj-missing', name: 'Absent', hear: 'rien', caseId: 'case-1', owned: true, status: 'absent' },
    { id: 'obj-multi', name: 'Duo', hear: 'duo', caseId: 'case-1', owned: true, status: 'available',
      methods: [{ objectIds: ['obj-a', 'obj-b'], gesture: 'ensemble' }, { objectIds: ['obj-a'], gesture: 'solo chaîne' }] }
  ]
  const cases = [{ id: 'case-1', name: 'Valise forêt' }, { id: 'case-2', name: 'Caisse eau' }]
  return { objects, cases, sounds: [], objectSounds: [] }
}

test('1 valise OBJ-A → bruitage associé OBJ-A', () => {
  const graph = buildRelationGraph(base())
  const sum = summarizeInventory(graph, { containerId: 'case-1' })
  assert.ok(sum.foleys.some(f => f.sourceObjectId === 'obj-a' || f.objectIds.includes('obj-a')))
  assert.ok(sum.foleys.some(f => f.name === 'cliquetis'))
})

test('2 bruitage multi-objets non proposé si B manque', () => {
  const data = base()
  data.objects = data.objects.filter(o => o.id !== 'obj-b')
  const graph = buildRelationGraph(data)
  const ids = availableObjectIds(data.objects.filter(isObjectAvailable))
  const duo = graph.foleys.filter(f => f.sourceObjectId === 'obj-multi')
  for (const f of duo) {
    const complete = completeMethods(f, ids)
    assert.ok(complete.every(m => !m.objectIds.includes('obj-b') || ids.has('obj-b')))
    assert.ok(complete.some(m => m.objectIds.length === 1 && m.objectIds[0] === 'obj-a'), 'solo method remains')
  }
  const onlyDuo = duo.filter(f => completeMethods(f, ids).every(m => m.objectIds.includes('obj-b') && m.objectIds.includes('obj-a')))
  assert.equal(onlyDuo.filter(f => completeMethods(f, ids).length).length, 0)
})

test('3 objet absent jamais proposé disponible', () => {
  const graph = buildRelationGraph(base())
  const sum = summarizeInventory(graph, { containerId: 'case-1' })
  assert.ok(!sum.objects.some(o => o.id === 'obj-missing'))
  assert.ok(sum.foleys.every(f => !f.objectIds.includes('obj-missing') || completeMethods(f, availableObjectIds(sum.objects)).length))
})

test('4 objet alternatif = seconde méthode OK', () => {
  const graph = buildRelationGraph(base())
  const ids = availableObjectIds(base().objects.filter(isObjectAvailable))
  const duo = graph.foleys.find(f => f.sourceObjectId === 'obj-multi')
  const methods = completeMethods(duo, ids)
  assert.ok(methods.length >= 1)
  assert.ok(methods.some(m => m.objectIds.includes('obj-a')))
})

test('5 filtre forêt → uniquement bruitages liés', () => {
  const graph = buildRelationGraph(base())
  const sum = summarizeInventory(graph, { universe: 'foret' })
  assert.ok(sum.objectCount >= 1)
  assert.ok(sum.objects.every(o => (o.tags || []).some(t => /foret|feuilles|papier/i.test(t)) || /froissement|feuilles|papier/i.test(`${o.hear} ${o.imagine} ${o.name}`)))
})

test('6 leurres ne modifient pas relations métier', () => {
  const data = base()
  const graphBefore = buildRelationGraph(data)
  const out = generateChallenge({ containerId: 'case-1', gameType: 'F' }, { graph: graphBefore, ...data }, { rng: () => 0.2 })
  assert.equal(out.ok, true)
  assert.equal(out.challenge.gameType, 'F')
  const decoy = out.challenge.cards.find(c => c.layer === DATA_LAYER.GAME_DATA)
  assert.ok(decoy)
  const graphAfter = buildRelationGraph(data)
  assert.equal(graphBefore.foleys.length, graphAfter.foleys.length)
  assert.ok(!graphAfter.objects.some(o => o.id === decoy.id))
})

test('7 offline : moteur pur sans réseau', () => {
  const out = generateChallenge({ containerId: 'case-1' }, base(), { rng: () => 0.3 })
  assert.equal(out.ok, true)
  assert.equal(out.challenge.provenance, 'generated')
})

test('8 scan contenant → défi direct', () => {
  const out = generateChallenge({ containerId: 'case-1', gameType: 'A' }, base())
  assert.equal(out.ok, true)
  assert.ok((out.challenge.objectIds || []).every(id => id !== 'obj-c'))
})

test('9 atelier avec contenu réel du contenant', () => {
  const out = generateWorkshop({ containerId: 'case-1', duration: 30 }, base(), { rng: () => 0.4 })
  assert.equal(out.ok, true)
  assert.ok(out.workshop.activities.length >= 2)
  for (const act of out.workshop.activities) {
    for (const id of act.objectIds || []) {
      assert.notEqual(id, 'obj-missing')
      assert.notEqual(id, 'obj-c') // other case
    }
  }
})

test('10 atelier sans activité sur objet absent', () => {
  const out = generateWorkshop({ containerId: 'case-1', duration: 30 }, base())
  assert.equal(out.ok, true)
  const allIds = out.workshop.activities.flatMap(a => a.objectIds || [])
  assert.ok(!allIds.includes('obj-missing'))
})

test('11 durée totale cohérente', () => {
  const out = generateWorkshop({ containerId: 'case-1', duration: 30 }, base())
  assert.equal(out.ok, true)
  assert.equal(out.workshop.duration, 30)
  assert.ok(out.workshop.totalMinutes > 0)
  assert.ok(out.workshop.totalMinutes <= 35)
})

test('12 séance 30 min plusieurs types sans répétition inutile même bruitage', () => {
  const storage = { store: null, getItem() { return this.store }, setItem(_, v) { this.store = v } }
  const out = generateWorkshop({ containerId: 'case-1', duration: 30 }, base(), { storage, rng: () => 0.15 })
  assert.equal(out.ok, true)
  const types = new Set(out.workshop.activities.map(a => a.gameType))
  assert.ok(types.size >= 2)
  const foleys = out.workshop.activities.map(a => a.challenge?.foleyId).filter(Boolean)
  const uniq = new Set(foleys)
  assert.ok(uniq.size === foleys.length || foleys.length <= 2)
})

test('historique local simple', () => {
  const storage = { store: null, getItem() { return this.store }, setItem(_, v) { this.store = v } }
  rememberGameEvent({ kind: 'challenge', fingerprint: 'A:x', gameType: 'A' }, storage)
  assert.equal(loadGameHistory(storage).items[0].fingerprint, 'A:x')
})


test('13 grand groupe : chaque participant a un rôle de bruitage', () => {
  const out = generateChallenge({ containerId: 'case-1', gameType: 'C', participants: 12 }, base(), { rng: () => 0.2 })
  assert.equal(out.ok, true)
  assert.equal(out.challenge.participants, 12)
  assert.equal(out.challenge.participantPlan.length, 12)
  assert.ok(out.challenge.participantPlan.every(role => role.object && role.cue))
})

test('14 atelier grand groupe conserve la répartition à chaque activité', () => {
  const out = generateWorkshop({ containerId: 'case-1', duration: 30, groupSize: 12 }, base(), { rng: () => 0.2 })
  assert.equal(out.ok, true)
  assert.equal(out.workshop.groupSize, 12)
  assert.ok(out.workshop.activities.length >= 1)
  for (const activity of out.workshop.activities) {
    assert.equal(activity.participantPlan.length, 12)
    assert.ok(activity.participantPlan.every(role => role.object && role.cue))
  }
})
