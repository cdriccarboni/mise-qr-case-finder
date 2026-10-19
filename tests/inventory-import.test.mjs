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
test('colonnes ID,Nom,Contenant,Quantité,Longueur,Couleur,Catégorie,Emplacement,Statut : IDs permanents conservés', () => {
  const csv = 'ID,Nom,Contenant,Quantité,Longueur,Couleur,Catégorie,Emplacement,Statut\nCASE-DEMO-01-XLR-1,XLR-XLR,CASE-DEMO-01,1,"1,5 m",rouge,Câble,,validé-source\nCASE-DEMO-01-XLR-2,XLR-XLR,CASE-DEMO-01,1,"1,5 m",blanc,Câble,poche,validé-source\n'
  const a = run({ objects: [], cases: [] }, csv)
  assert.deepEqual(a.res.objects.map(o => o.id), ['CASE-DEMO-01-XLR-1', 'CASE-DEMO-01-XLR-2'])
  assert.equal(a.res.cases.length, 1); assert.equal(a.res.cases[0].id, 'CASE-DEMO-01')
  assert.equal(a.res.objects[1].location, 'poche'); assert.equal(a.res.objects[0].length, '1,5 m'); assert.equal(a.res.objects[0].status, 'validé-source')
  // renommage d'affichage du contenant puis réimport : 0 nouveau, 0 conflit
  const renamed = { ...a.state, cases: a.state.cases.map(c => ({ ...c, name: 'NOM AFFICHÉ' })) }
  const b = run(renamed, csv)
  assert.deepEqual(b.plan.summary, { create: 0, review: 0, unchanged: 2, errors: 0 })
})

test('colonne « Nom contenant » : ID permanent conservé, nom lisible sur l’étiquette, ré-import idempotent', () => {
  const rows = [
    { ID: 'SAC-FICTIF-A-01-X', Nom: 'Objet fictif', Contenant: 'SAC-FICTIF-A-01', 'Nom contenant': 'SAC FICTIF — 1/2', Quantité: '1' },
    { ID: 'SAC-FICTIF-A-01-Y', Nom: 'Autre objet fictif', Contenant: 'SAC-FICTIF-A-01', 'Nom contenant': 'SAC FICTIF — 1/2', Quantité: '' }
  ]
  const first = applyInventoryPlan(planInventoryImport(rows), {}, { now: 'T' })
  assert.equal(first.cases.length, 1)
  assert.equal(first.cases[0].id, 'SAC-FICTIF-A-01')
  assert.equal(first.cases[0].name, 'SAC FICTIF — 1/2')
  assert.equal(first.objects.length, 2)
  assert.equal(first.objects[1].quantity, null)
  const again = applyInventoryPlan(planInventoryImport(rows, first), first, { now: 'T2' })
  assert.equal(again.cases.length, 0)
  assert.equal(again.objects.length, 0)
  // un nom déjà choisi n'est jamais écrasé
  const named = [{ ...first.cases[0], name: 'Nom choisi' }]
  const third = applyInventoryPlan(planInventoryImport(rows), { cases: named }, { now: 'T3' })
  assert.equal(third.cases.length, 0)
})

test('« Nom contenant » : renomme un contenant existant seulement si son nom est encore son ID', () => {
  const rows = [{ ID: 'SAC-FICTIF-B-01-X', Nom: 'Objet fictif', Contenant: 'SAC-FICTIF-B-01', 'Nom contenant': 'SAC FICTIF B', Quantité: '1' }]
  const existing = [{ id: 'SAC-FICTIF-B-01', name: 'SAC-FICTIF-B-01', importName: 'SAC-FICTIF-B-01', parentId: '' }]
  const res = applyInventoryPlan(planInventoryImport(rows, { cases: existing }), { cases: existing }, { now: 'T' })
  assert.equal(res.cases.length, 1)
  assert.equal(res.cases[0].id, 'SAC-FICTIF-B-01')
  assert.equal(res.cases[0].name, 'SAC FICTIF B')
  const chosen = [{ ...existing[0], name: 'Mon sac' }]
  const res2 = applyInventoryPlan(planInventoryImport(rows, { cases: chosen }), { cases: chosen }, { now: 'T' })
  assert.equal(res2.cases.length, 0)
})
