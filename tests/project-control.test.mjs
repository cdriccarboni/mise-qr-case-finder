import assert from 'node:assert/strict'
import test from 'node:test'
import { readProjectContext, normalizeDetectedObjects, makeControlSummary, makeProjectSummary, planProjectOpen, makeArtLinkExport } from '../src/project-control.js'

test('project context accepts same-origin return and keeps old project id unchanged',()=>{
  const context=readProjectContext('?projectId=show-2019&projectName=Ancien%20spectacle&projectType=show&return=%2Fcompany%2Fprojects','https://art.acousmatic-theatre.fr/mise/')
  assert.equal(context.projectId,'show-2019')
  assert.equal(context.projectName,'Ancien spectacle')
  assert.equal(context.projectType,'show')
  assert.equal(context.returnUrl,'https://art.acousmatic-theatre.fr/company/projects')
})

test('project context accepts a cross-origin https returnUrl and ignores unsafe addresses',()=>{
  const pages='https://cdriccarboni.github.io/mise-qr-case-finder/'
  const ok=readProjectContext('?projectId=eac-atelier&projectName=Atelier%20EAC&source=art&returnUrl=https%3A%2F%2Fart.example%2Fprojets%2Feac-atelier',pages)
  assert.equal(ok.projectId,'eac-atelier')
  assert.equal(ok.projectName,'Atelier EAC')
  assert.equal(ok.source,'art')
  assert.equal(ok.returnUrl,'https://art.example/projets/eac-atelier')
  assert.equal(readProjectContext('?projectId=eac-old&returnUrl=javascript:alert(1)',pages).returnUrl,'')
  assert.equal(readProjectContext('?projectId=eac-old&returnUrl=https://user:secret@art.example/x',pages).returnUrl,'')
  assert.equal(readProjectContext('?projectId=eac-old&returnUrl=data:text/html,hi',pages).returnUrl,'')
  assert.equal(readProjectContext('?projectId=../etc&projectName=Nope',pages).projectId,'')
  assert.equal(readProjectContext(`?projectId=${'a'.repeat(81)}`,pages).projectId,'')
  assert.equal(readProjectContext('?projectId=show-1&projectName=%0A%0A<script>',pages).projectName,'<script>')
})

test('an unknown project is created, a linked one is opened, an old mise is offered for attachment',()=>{
  const project={projectId:'show-2019',projectName:'Ancien spectacle'}
  assert.equal(planProjectOpen([],project).action,'create')
  assert.equal(planProjectOpen([],project).name,'Ancien spectacle')
  const old={id:'mise-old',name:'Mise d’avant',createdAt:'2020-01-01T00:00:00.000Z'}
  assert.equal(planProjectOpen([old],project).action,'attach')
  const linked={id:'mise-linked',name:'Déjà liée',projectId:'show-2019',updatedAt:'2026-09-01T00:00:00.000Z'}
  assert.deepEqual(planProjectOpen([old,linked],project),{action:'open',mise:linked})
  assert.equal(planProjectOpen([linked],{projectId:''}).action,'none')
})

test('the ART summary is a local count and is not a copy of the catalogue',()=>{
  assert.deepEqual(makeArtLinkExport({projectId:'show-2019',projectName:'Ancien spectacle',objectCount:12,caseCount:3,updatedAt:'2026-09-27T12:00:00.000Z'}),{
    version:1,kind:'mises-art-summary',projectId:'show-2019',projectName:'Ancien spectacle',objectCount:12,caseCount:3,updatedAt:'2026-09-27T12:00:00.000Z'
  })
  assert.equal('objects' in makeArtLinkExport({objectCount:1,caseCount:0}),false)
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
