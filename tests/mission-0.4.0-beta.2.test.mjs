import test from 'node:test'
import assert from 'node:assert/strict'
import { instrumentVocabulary } from '../src/instrument-vocabulary.js'
import { buildGlobalIndex, indexStats, searchGlobalIndex } from '../src/index-engine.js'
import { confidenceLevel, buildVisionVocabulary, mergeVisionCandidates, VISION_BENCHMARK_PLAN } from '../src/vision-engine.js'
import { importCapabilities, SUPPORTED_IMPORT } from '../src/data-import.js'
import { LABEL_PRESETS } from '../src/label-editor.js'

test('instrument registry is extensible and includes requested families', () => {
  const rows=instrumentVocabulary(['xaphoon test'])
  assert.ok(rows.some(x=>x.name==='violon'))
  assert.ok(rows.some(x=>x.name==='guitare électrique'))
  assert.ok(rows.some(x=>x.name==='xaphoon test'&&x.family==='Enrichi par la base'))
})

test('global index covers objects, instruments, games and public recipes', () => {
  const rows=buildGlobalIndex({
    objects:[{id:'o1',name:'Guitare',aliases:['guitar'],sounds:['corde']}],
    cases:[{id:'c1',name:'Valise scène'}],
    kits:[],mises:[],
    seed:{sounds:[{id:'s1',name:'Tintement'}],resource_index:[{id:'d1',name:'Guide'}]},
    publicFoley:{records:[{id:'p1',sound:'Pluie',technique:'tapoter',objects:['papier']}],games:[{id:'g1',title:'Défi'}],pedagogyActivities:[],fabrications:[]}
  })
  const stats=indexStats(rows)
  assert.equal(stats.objects,1)
  assert.equal(stats.publicRecipes,1)
  assert.ok(stats.instruments>10)
  assert.ok(searchGlobalIndex(rows,'guitare').length>0)
})

test('vision exposes uncertainty instead of forced identification', () => {
  assert.equal(confidenceLevel(.9).label,'IDENTIFIÉ')
  assert.equal(confidenceLevel(.75).label,'PROBABLE')
  assert.equal(confidenceLevel(.5).label,'SUGGESTION')
  assert.equal(confidenceLevel(.1).label,'À IDENTIFIER')
  const merged=mergeVisionCandidates([{label:'bouteille',score:.52,source:'standard'}],{})
  assert.equal(merged[0].validated,false)
  assert.match(VISION_BENCHMARK_PLAN.reason,/aucun score n’est inventé/i)
})

test('vision vocabulary includes database objects, public props and instruments', () => {
  const vocab=buildVisionVocabulary({
    objects:[{name:'Chaîne métallique',aliases:['petite chaîne'],sounds:['cliquetis']}],
    seed:{sounds:[{name:'Gréement'}]},
    publicFoley:{records:[{sound:'Ailes',objects:['grand parapluie']}]}
  })
  assert.ok(vocab.includes('Chaîne métallique'))
  assert.ok(vocab.includes('grand parapluie'))
  assert.ok(vocab.includes('violon'))
})

test('universal import advertises the real supported surface', () => {
  const caps=importCapabilities()
  for(const name of ['XLSX','ODS','TSV','Markdown','PDF texte','DOCX']) assert.ok(caps.direct.includes(name))
  assert.ok(SUPPORTED_IMPORT.test('lot.zip'))
  assert.ok(SUPPORTED_IMPORT.test('table.ods'))
  assert.ok(SUPPORTED_IMPORT.test('notes.md'))
  assert.ok(SUPPORTED_IMPORT.test('photo.webp'))
})

test('label editor exposes thermal printer presets without DOM side effects', () => {
  assert.ok(LABEL_PRESETS.length>=5)
  assert.ok(LABEL_PRESETS.every(p=>p.w>0&&p.h>0))
})
