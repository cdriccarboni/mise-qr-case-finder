import test from 'node:test'
import assert from 'node:assert/strict'
import { HALLOWEEN_THEMES, halloweenMatches } from '../src/halloween.js'
import { THEME_PACKS, searchThemeIndex, publicRecipeThemeTags } from '../src/theme-explorer.js'
import { buildGlobalIndex } from '../src/index-engine.js'
import { readFileSync } from 'node:fs'

const records=[
  {id:'obj-1',kind:'objet',label:'Vieille porte hantée',terms:['Porte qui grince','planches']},
  {id:'obj-2',kind:'objet',label:'Chaîne rouillée',terms:['Métal','bruit de chaîne']},
  {id:'obj-3',kind:'objet',label:'Pomme rouge',terms:['fruits','cuisine']},
  {id:'sound-1',kind:'son',label:'Fantôme',terms:['spectre']},
  {id:'recipe-1',kind:'recette publique',label:'Tonnerre',terms:['orage','foudre']},
  {id:'doc-1',kind:'document',label:'Bruit de pas',terms:['nuit']},
  {id:'unrelated',kind:'objet',label:'Une crique',terms:['paysage']},
  {id:'metal',kind:'objet',label:'Boîte en métal',terms:['papier','carton','bois','chaîne']},
  {id:'winter',kind:'objet',label:'Pas dans la neige',terms:['neige poudreuse']},
  {id:'christmas',kind:'recette publique',label:'Grelots de Noël',terms:['fête']},
  {id:'tech-spectre',kind:'recette publique',label:'Bourdonnement de néon',terms:['spectre acoustique']}
]

test('Halloween is a selective view over real rows, not an invented stock',()=>{
  const before=structuredClone(records)
  const results=halloweenMatches(records)
  assert.deepEqual(new Set(results.map(x=>x.id)),new Set(['obj-1','sound-1','recipe-1','doc-1']))
  assert.deepEqual(records,before)
  assert.equal(results.every(x=>x.halloweenScore>0),true)
  assert.equal(HALLOWEEN_THEMES[0].id,'all')
})
test('generic paper, metal, chain, ordinary steps and acoustic spectrum are not Halloween',()=>{
  const ids=new Set(searchThemeIndex(records,{theme:'halloween'}).map(x=>x.id))
  for(const id of ['metal','obj-2','obj-3','winter','tech-spectre','unrelated'])assert.equal(ids.has(id),false,id)
})
test('subtheme, source and multiword/accent insensitive search actually filter',()=>{
  assert.deepEqual(searchThemeIndex(records,{theme:'halloween',group:'haunted'}).map(x=>x.id),['obj-1','sound-1'])
  assert.deepEqual(searchThemeIndex(records,{theme:'halloween',group:'creatures'}).map(x=>x.id),[])
  assert.deepEqual(searchThemeIndex(records,{theme:'halloween',query:'PORTE hantée'}).map(x=>x.id),['obj-1'])
  assert.deepEqual(searchThemeIndex(records,{theme:'halloween',source:'mine'}).map(x=>x.id),['obj-1'])
  assert.deepEqual(searchThemeIndex(records,{theme:'halloween',source:'public'}).map(x=>x.id),['recipe-1'])
  assert.deepEqual(searchThemeIndex(records,{theme:'halloween',query:'introuvable'}),[])
})
test('Noël and themed winter results do not overlap arbitrary inventory',()=>{
  const ids=searchThemeIndex(records,{theme:'noel'}).map(x=>x.id)
  assert.ok(ids.includes('christmas'))
  assert.ok(ids.includes('winter'))
  assert.ok(!ids.includes('metal'))
  assert.equal(THEME_PACKS.length,14)
  assert.equal(new Set(THEME_PACKS.map(x=>x.id)).size,14)
})
test('public catalogue keeps exactly the documented source records with editorial theme tags',()=>{
  const d=JSON.parse(readFileSync(new URL('../public/public-foley.json',import.meta.url)))
  assert.equal(d.records.length,216)
  assert.equal(d.counts.records,216)
  assert.equal(d.counts.themePacks,14)
  assert.equal(d.counts.themeTaggedRecords,d.records.filter(x=>x.themeTags?.length).length)
  assert.equal(new Set(d.records.map(x=>x.id)).size,216)
  for(const r of d.records){
    assert.deepEqual(r.themeTags||[],publicRecipeThemeTags(r))
    assert.equal(r.publicationScope,'PUBLIC_WEB')
    assert.ok(r.sourceUrl)
  }
  const indexed=buildGlobalIndex({publicFoley:d})
  const halloween=searchThemeIndex(indexed,{theme:'halloween'})
  assert.ok(halloween.length<30,'Halloween must not match half the index again')
  assert.ok(halloween.length>0)
  assert.ok(searchThemeIndex(indexed,{theme:'noel'}).length>0)
  assert.ok(searchThemeIndex(indexed,{theme:'mer'}).length>0)
})
