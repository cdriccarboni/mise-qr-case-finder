import assert from 'node:assert/strict'
import test from 'node:test'
import { readProjectContext, normalizeDetectedObjects, makeControlSummary, makeProjectSummary } from '../src/project-control.js'

test('project context accepts same-origin return and keeps old project id unchanged',()=>{
  const context=readProjectContext('?projectId=show-2019&projectName=Ancien%20spectacle&projectType=show&return=%2Fcompany%2Fprojects','https://art.acousmatic-theatre.fr/mise/')
  assert.equal(context.projectId,'show-2019')
  assert.equal(context.projectName,'Ancien spectacle')
  assert.equal(context.projectType,'show')
  assert.equal(context.returnUrl,'https://art.acousmatic-theatre.fr/company/projects')
})

test('project context rejects cross-origin return',()=>{
  const context=readProjectContext('?projectId=eac-old&return=https%3A%2F%2Fevil.example%2F','https://art.acousmatic-theatre.fr/mise/')
  assert.equal(context.returnUrl,'')
})

test('photo analysis preserves structured proposals and defaults safely',()=>{
  const items=normalizeDetectedObjects({objects:[
    {label:'Feuille métal',category:'bruitage',quantity:2,confidence:.88},
    {label:'Câble XLR',category:'technique'}
  ]})
  assert.deepEqual(items,[
    {label:'Feuille métal',category:'bruitage',quantity:2,confidence:.88,validated:false},
    {label:'Câble XLR',category:'technique',quantity:1,validated:false}
  ])
})

test('ART project summary exports only human-validated detections',()=>{
  const mise={
    id:'mise-1',name:'Plateau',projectId:'show-old',projectName:'Spectacle ancien',projectType:'show',
    objectIds:['o1','o2'],checked:['o1'],updatedAt:'2026-09-25T11:00:00.000Z',controlledAt:'2026-09-25T10:59:00.000Z',
    latestControl:{detectedObjects:[
      {label:'Métal',category:'bruitage',quantity:1,confidence:.9,validated:true},
      {label:'Câble',category:'technique',quantity:2,confidence:.7,validated:false}
    ]}
  }
  assert.deepEqual(makeProjectSummary(mise),{
    version:1,projectId:'show-old',projectName:'Spectacle ancien',projectType:'show',miseId:'mise-1',miseName:'Plateau',
    objectCount:2,checkedCount:1,
    detectedObjects:[{label:'Métal',category:'bruitage',quantity:1,confidence:.9}],
    controlledAt:'2026-09-25T10:59:00.000Z',updatedAt:'2026-09-25T11:00:00.000Z'
  })
})

test('control record remains explicitly human validated',()=>{
  const mise={id:'m',name:'M',projectId:'p',projectName:'P',projectType:'eac',objectIds:['o'],checked:['o']}
  const control=makeControlSummary(mise,[{id:'o',name:'Objet'}],{method:'photo-assisted',detectedObjects:[{label:'Objet',category:'bruitage',quantity:1,validated:true}]},'2026-09-25T12:00:00.000Z')
  assert.equal(control.humanValidated,true)
  assert.equal(control.method,'photo-assisted')
})
