import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsvText, planInventoryImport, applyInventoryPlan } from '../src/inventory-import.js'
const CSV = 'Sac/Contenant;Compartiment;Objet;Quantité;Catégorie;Statut\nSac fictif A;Poche avant;Câble XLR 3 m;4;Câble;\nSac fictif A;;Pied de micro;;Pied;à vérifier\n;;Objet orphelin;1;;\n"Valise fictive";Tiroir 1;"Micro ""démo""";2;Micro;ok\n'
function run(state, text = CSV, opts) {
  const { rows } = parseCsvText(text)
  const plan = planInventoryImport(rows, state)
  const res = applyInventoryPlan(plan, state, opts)
  return { plan, res, state: { cases: [...state.cases, ...res.cases], objects: [...state.objects.filter(o => !res.objects.some(w => w.id === o.id)), ...res.objects] } }
}
test('parse CSV ; avec guillemets et en-têtes français', () => {
  const { headers, rows } = parseCsvText(CSV)
  assert.equal(headers[0], 'Sac/Contenant'); assert.equal(rows.length, 4); assert.equal(rows[3].Objet, 'Micro "démo"')
})
test('premier import : objets, contenants, compartiments ; quantité vide reste vide ; statut provisoire', () => {
  const { plan, res } = run({ objects: [], cases: [] })
  assert.equal(plan.summary.create, 4)
  assert.equal(res.objects.length, 4)
  const pied = res.objects.find(o => o.name === 'Pied de micro')
  assert.equal(pied.quantity, null); assert.equal(pied.status, 'à vérifier')
  assert.equal(res.objects.find(o => o.name === 'Câble XLR 3 m').status, 'provisoire')
  const orphan = res.objects.find(o => o.name === 'Objet orphelin')
  assert.equal(orphan.caseId, ''); assert.equal(orphan.unassigned, true)
  assert.equal(res.cases.length, 4) // Sac A, Poche avant, Valise, Tiroir 1
  const poche = res.cases.find(c => c.name === 'Poche avant')
  assert.equal(res.cases.find(c => c.id === poche.parentId).name, 'Sac fictif A')
})
test('réimport du même CSV = 0 nouveau, 0 écriture', () => {
  const first = run({ objects: [], cases: [] })
  const second = run(first.state)
  assert.deepEqual(second.plan.summary, { create: 0, review: 0, unchanged: 4, errors: 0 })
  assert.equal(second.res.objects.length, 0); assert.equal(second.res.cases.length, 0)
})
test('modification = conflit, pas d\'écrasement sans accord ; accord = mise à jour sans effacer', () => {
  const first = run({ objects: [], cases: [] })
  const changed = CSV.replace('Câble XLR 3 m;4', 'Câble XLR 3 m;6')
  const r = run(first.state, changed)
  assert.equal(r.plan.summary.review, 1); assert.equal(r.res.objects.length, 0); assert.equal(r.res.conflicts.length, 1)
  const ok = run(first.state, changed, { applyUpdates: true })
  const xlr = ok.res.objects[0]; assert.equal(xlr.quantity, 6); assert.equal(xlr.family, 'Câble')
  const emptied = run(first.state, CSV.replace('Câble XLR 3 m;4', 'Câble XLR 3 m;'), { applyUpdates: true })
  assert.equal(emptied.plan.summary.unchanged, 4) // vide n'efface jamais
})
