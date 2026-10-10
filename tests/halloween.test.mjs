import test from 'node:test'
import assert from 'node:assert/strict'
import { HALLOWEEN_THEMES, halloweenMatches } from '../src/halloween.js'

const records=[
  {id:'obj-1',kind:'objet',label:'Vieille porte',terms:['Porte qui grince','planches']},
  {id:'obj-2',kind:'objet',label:'Chaîne rouillée',terms:['Métal','bruit de chaîne']},
  {id:'obj-3',kind:'objet',label:'Pomme rouge',terms:['fruits','cuisine']},
  {id:'sound-1',kind:'son',label:'Fantôme',terms:['spectre']},
  {id:'recipe-1',kind:'recette publique',label:'Tonnerre',terms:['orage','foudre']},
  {id:'doc-1',kind:'document',label:'Bruit de pas',terms:['nuit']},
  {id:'unrelated',kind:'objet',label:'Une crique',terms:['paysage']}
]

test('Halloween explores existing objects, sound, recipe, and document without inventing stock',()=>{
  const before=structuredClone(records)
  const results=halloweenMatches(records)
  assert.deepEqual(new Set(results.map(x=>x.id)),new Set(['obj-1','obj-2','sound-1','recipe-1','doc-1']))
  assert.deepEqual(records,before)
  assert.equal(results.every(r=>r.halloweenScore>0),true)
})
test('theme switch and accent-insensitive filter are supported',()=>{
  assert.deepEqual(halloweenMatches(records,{theme:'haunted'}).map(x=>x.id).sort(),['obj-1','obj-2'])
  assert.deepEqual(halloweenMatches(records,{theme:'creatures'}).map(x=>x.id),['sound-1'])
  assert.deepEqual(halloweenMatches(records,{query:'CHAÎNE'}).map(x=>x.id),['obj-2'])
  assert.deepEqual(halloweenMatches(records,{query:'introuvable'}),[])
  assert.equal(HALLOWEEN_THEMES[0].id,'all')
})
