import test from 'node:test'
import assert from 'node:assert/strict'
import { inventoryColumnMap, planInventoryCsv } from '../src/inventory-csv-plan.js'
test('reconnaît colonnes françaises, longueurs et couleurs', () => {
  const rows = [{ 'Désignation': 'XLR', Sac: 'Sac câbles 1', 'Qté': '3', Longueur: '6 m', Couleur: 'Noir' }]
  const p = planInventoryCsv(rows)
  assert.equal(p.changes[0].row.quantity, 3)
  assert.equal(p.changes[0].row.length, '6 m')
  assert.equal(p.summary.create, 1)
  assert.equal(p.requiresConfirmation, true)
})
test('réimporter sans modifier ne crée rien', () => {
  const rows = [{Nom:'Jack', Contenant:'Sac A', Quantité:'2', Couleur:'Bleu'}]
  const old = [{id:'stable-1',name:'Jack',container:'Sac A',quantity:2,color:'Bleu'}]
  const p = planInventoryCsv(rows, old)
  assert.deepEqual(p.summary, { create:0, review:0, unchanged:1, errors:0 })
  assert.equal(p.changes[0].existingId, 'stable-1')
})
test('mise à jour existante nécessite revue et non écrasement', () => {
  const p = planInventoryCsv([{ Nom:'Micro', Contenant:'Valise', Quantité:'4', ID:'mic-1' }], [{id:'mic-1',name:'Micro',container:'Valise',quantity:3}])
  assert.equal(p.summary.review, 1)
})
test('lignes invalides et doublons sont signalés', () => {
  const row = {Nom:'Pied micro',Sac:'Sac pieds',Quantité:'2'}
  const p = planInventoryCsv([row,row,{...row,Nom:'Bras micro',Quantité:'-1'}])
  assert.equal(p.summary.errors, 2)
})
test('aucune ligne ne peut être importée sans nom et contenant', () => {
  assert.throws(() => planInventoryCsv([{ Nom:'Micro' }]), /Colonnes nom et contenant/)
  assert.equal(inventoryColumnMap(['Catégorie','Pochette']).category,'Catégorie')
})
