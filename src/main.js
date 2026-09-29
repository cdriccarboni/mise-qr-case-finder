
import './style.css'
import Fuse from 'fuse.js'
import QRCode from 'qrcode'
import { BrowserQRCodeReader } from '@zxing/browser'
import { openDB } from 'idb'
import { registerSW } from 'virtual:pwa-register'
import { readProjectContext, makeControlSummary, makeProjectSummary, planProjectOpen, makeArtLinkExport } from './project-control.js'
import { artGoogleSession, requestGoogleSession, connectedGoogleProfile, loadPrivateState, savePrivateState, createSharePackage, loadSharePackage, androidGoogleSignInBlocked, googleSignInUnavailableMessage } from './google-sync.js'

import { readData, enrichObjects, assignSoundFields, soundFields, PROVENANCE, provenanceLabel } from './data-bruitage.js'
import { openDataBruitage } from './data-ui.js'
import { openLocalPhoto } from './vision-ui.js'
import { APP_VERSION } from './version.js'
import { ACOUSMATIC_THEATRE_URL, AUTHOR_WEBSITE_URL, externalAnchor } from './about.js'
import wordmarkSvg from './brand/wordmark.svg?raw'
import { FAMILIES } from './constants.js'
import { entityUrl, shortId, readEntityUrl } from './qr-link.js'
import { renderLabelDataUrl } from './label-render.js'
import { proposeVibe } from './vibe-engine.js'
import { generateExercises } from './exercise-engine.js'
import { buildRelationGraph, summarizeInventory, OBJECT_STATUSES } from './relations.js'
import { generateChallenge, generateWorkshop, surprisePick } from './game-engine.js'
import { rememberGameEvent } from './game-history.js'
import { playHubHtml, challengeHtml, workshopSetupHtml, workshopProgramHtml, workshopConductorHtml } from './game-ui.js'
import { publicReferenceIdeas, generatePublicGame, randomPublicUniverse, publicActivityProgram } from './public-foley.js'
import { publicHubHtml, fabricationsHtml, activitiesHtml, publicGameHtml, publicWorkshopHtml } from './public-ui.js'
import { parseIntent, answerIntent } from './conversation.js'
import { newLearning } from './learning.js'
import { answerBlock, vibeBlock, exerciseBlock } from './terrain-ui.js'
import './identity.css'
import { DEFAULT_INK, INK_PALETTE, applyInk, contrastOn, inkFromSettings, inkSetting, parseInk } from './ink.js'
import { migrateLocalKeys, migrateSessionKeys, migrateDatabase, createStores, DB_NAME, DB_VERSION, LOCAL_KEYS, PROJECT_PREFIX } from './storage.js'
import { applyBackup } from './backup.js'
migrateLocalKeys()
migrateSessionKeys()
applyInk(localStorage.getItem(LOCAL_KEYS.ink))

let applySwUpdate=()=>{}
applySwUpdate=registerSW({
  immediate:true,
  onNeedRefresh(){
    toast('Nouvelle version disponible')
    setTimeout(()=>applySwUpdate(true),1600)
  }
})

const $=(s,r=document)=>r.querySelector(s)
const $$=(s,r=document)=>[...r.querySelectorAll(s)]
const uid=p=>`${p}-${crypto.randomUUID()}`
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/[-_/]+/g,' ').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
const unique=a=>[...new Set((a||[]).filter(Boolean))]
const safeExternal=x=>!/(gun|weapon|arme|fusil|pisto|coup de feu|explosi|knife)/i.test(JSON.stringify(x))
const params=new URLSearchParams(location.search)
const project=readProjectContext(location.search,location.href)
const INTERFACE_MODE_KEY='mises-interface-mode'
const CUSTOM_CATEGORIES_KEY='mises-custom-categories'
const isInventoryMode=()=>localStorage.getItem(INTERFACE_MODE_KEY)==='inventory'
const currentCategories=()=>{
  let custom=[]
  try{custom=JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY)||'[]')}catch{}
  return unique([...FAMILIES,...(Array.isArray(custom)?custom:[])])
}

await migrateDatabase()
const db=await openDB(DB_NAME,DB_VERSION,{upgrade(d){
  createStores(d)
}})
const undoStack=[]

const seed=await fetch('./data.json').then(r=>r.json()).catch(()=>({objects:[],containers:[],object_sound_links:[],web_reference_ideas:[],intent_packs:[]}))
const publicFoley=await fetch('./public-foley.json').then(r=>r.json()).catch(()=>({records:[],fabrications:[],games:[],pedagogyActivities:[],universeFrames:[],sources:[]}))

async function seedPersonal(){
  if(await db.get('settings','seeded-v3')) return
  for(const c of seed.containers||[]) {
    await db.put('cases',{...c,id:c.id,name:c.name||'Valise',part:null,total:null,source:'documents personnels'})
  }
  const soundsByObject=new Map()
  for(const l of seed.object_sound_links||[]){
    if(!soundsByObject.has(l.object_id)) soundsByObject.set(l.object_id,[])
    soundsByObject.get(l.object_id).push(l.sound_name)
  }
  const ids=[]
  for(const o of seed.objects||[]){
    const item={
      ...o,id:o.id,name:o.name,detectedName:'',
      sounds:unique(soundsByObject.get(o.id)||[]),
      tags:unique(o.aliases||[]),contexts:[],
      photo:'',source:'Data Bruitage · corpus agrégé',owned:true,
      status:o.status||'available',family:'À classer',
      caseId:o.container_id||''
    }
    await db.put('objects',item); ids.push(item.id)
  }
  await db.put('settings',{id:'seeded-v3',at:new Date().toISOString()})
}
await seedPersonal()

async function migrateDataBruitage(){
  if(await db.get('settings','data-bruitage-v1')) return
  const seededIds=new Set((seed.objects||[]).map(o=>o.id))
  const autoKit=await db.get('kits','kit-acoustique')
  if(autoKit && autoKit.source && autoKit.id==='kit-acoustique'){
    const ids=autoKit.objectIds||[]
    if(ids.length && ids.every(id=>seededIds.has(id))) await db.delete('kits','kit-acoustique')
  }
  for(const o of await db.getAll('objects')){
    if(seededIds.has(o.id) && o.source==='documents personnels'){
      o.source='Data Bruitage · corpus agrégé'
      await db.put('objects',o)
    }
  }
  await db.put('settings',{
    id:'data-bruitage-v1',
    at:new Date().toISOString(),
    sourceCount:(seed.sources||[]).length,
    resourceCount:(seed.resource_index||[]).length
  })
}
await migrateDataBruitage()

let objects=[],cases=[],kits=[],mises=[],learnings=[],catalogueSounds=[],catalogueObjectSounds=[],activeMise=null, scanner=null, photoTargetMiseId=null, pendingExerciseMinutes=1
let scanPurpose='browse',moveScanState=null
let projectSyncFailed=false
async function refresh(){
  const data=await readData(db)
  objects=enrichObjects(data)
  catalogueSounds=data.sounds||[]
  catalogueObjectSounds=data.objectSounds||[]
  cases=await db.getAll('cases')
  kits=await db.getAll('kits')
  mises=await db.getAll('mises')
  learnings=await db.getAll('learnings')
  const eligible=project.projectId?mises.filter(m=>m.projectId===project.projectId):mises
  if(!eligible.some(m=>m.id===activeMise)) activeMise=eligible.slice().sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''))[0]?.id||null
}
await refresh()

let driveSyncTimer=0,driveSyncBusy=false
async function privateStatePayload(){
  return {version:3,exportedAt:new Date().toISOString(),...await readData(db),kits:await db.getAll('kits'),learnings:await db.getAll('learnings'),settings:await db.getAll('settings')}
}
async function applyPrivateState(payload){
  await applyBackup(db, payload)
  if(Array.isArray(payload?.settings)){
    const savedInk = inkFromSettings(payload.settings)
    if(savedInk) localStorage.setItem(LOCAL_KEYS.ink, savedInk)
    else localStorage.removeItem(LOCAL_KEYS.ink)
    applyInk(savedInk)
    paintInkSwatches(savedInk || DEFAULT_INK)
  }
  activeMise=null;await refresh();render()
}
async function updateAccountStatus(){
  const saved=await db.get('settings','google-account'),session=artGoogleSession(),button=$('#accountBtn')
  const blocked=androidGoogleSignInBlocked(),fromArt=project.source==='art'
  if(button){
    button.textContent=blocked?'Google · Indisponible dans l’app':saved?.email?(session?`Google · ${saved.email}`:'Google · Reconnecter'):(fromArt?'Google · Continuer depuis ART':'Google · À connecter')
    button.classList.toggle('connected',Boolean(!blocked&&saved&&session))
  }
  const goal=$('#goalGoogle')
  if(goal)goal.textContent=blocked?'Connexion Google indisponible':fromArt?'Continuer Google depuis ART':'Connexion Google'
}
function explainAndroidGoogle(){
  const d=$('#modal')
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Connexion Google indisponible</b><small>Application Android</small></div><button id="closeAndroidGoogle" class="ghost" type="button">×</button></div><p>${esc(googleSignInUnavailableMessage())}</p><p class="hint">La recherche, les QR, les photos, les mémos sonores, l’import et la sauvegarde JSON restent disponibles sur cet appareil.</p></div>`
  d.showModal()
  $('#closeAndroidGoogle').onclick=()=>d.close()
}
async function connectGoogle(){
  if(androidGoogleSignInBlocked()){explainAndroidGoogle();return}
  const fromArt=project.source==='art'
  try{
    await requestGoogleSession({fromArt,interactive:true})
    const profile=await connectedGoogleProfile(),email=String(profile?.email||'').trim()
    if(!email)throw new Error('Compte Google non identifiable')
    const saved=await db.get('settings','google-account')
    if(!fromArt&&!saved?.email&&!confirm(`Utiliser ce compte Google pour la base privée MISES! ?\n\n${email}\n\nRien ne sera partagé publiquement.`))return
    await db.put('settings',{id:'google-account',email,name:profile?.name||'',confirmedAt:new Date().toISOString(),source:fromArt?'art-continuity':'mises'})
    await updateAccountStatus();applyUiPreferences();toast(fromArt?'Google repris depuis ART · vérification du Drive privé…':'Compte validé · vérification du Drive privé…')
    const remote=await loadPrivateState(),localCount=objects.length+cases.length+kits.length+mises.length
    if(remote.payload){
      if(localCount===0||confirm('Une sauvegarde MISES! privée existe sur Drive. La charger sur cet appareil ?')){await applyPrivateState(remote.payload);toast('Base privée chargée depuis Drive')}
    }else{
      await savePrivateState(await privateStatePayload());toast('Base privée créée dans Drive / _ART / MISES !')
    }
  }catch(error){toast(error instanceof Error?error.message:'Connexion Google impossible')}
}
function scheduleDriveSync(){
  clearTimeout(driveSyncTimer)
  driveSyncTimer=setTimeout(async()=>{
    const account=await db.get('settings','google-account');if(!account||!artGoogleSession()||driveSyncBusy)return
    driveSyncBusy=true
    try{const result=await savePrivateState(await privateStatePayload());await db.put('settings',{id:'drive-sync',at:new Date().toISOString(),fileId:result.file?.id||'',folderId:result.folder?.id||''})}
    catch{}finally{driveSyncBusy=false;updateAccountStatus()}
  },1200)
}

function linkToProject(m){
  if(project.projectId) Object.assign(m,{projectId:project.projectId,projectName:project.projectName,projectType:project.projectType})
  if(project.companyId) m.companyId=project.companyId
  return m
}
function publishProject(m){
  if(!m.projectId)return
  const summary=makeProjectSummary(m)
  try{
    localStorage.setItem(`${PROJECT_PREFIX}${m.projectId}`,JSON.stringify(summary))
    projectSyncFailed=false
    window.dispatchEvent(new CustomEvent('art-mises-project-change',{detail:summary}))
  }catch{projectSyncFailed=true}
  renderProjectContext()
}
async function saveMise(m){
  m.objectIds=unique(m.objectIds||[])
  m.checked=unique(m.checked||[]).filter(id=>m.objectIds.includes(id))
  m.updatedAt=new Date().toISOString()
  await db.put('mises',m)
  publishProject(m);scheduleDriveSync()
}
function recordControl(m,details){
  m.latestControl=makeControlSummary(m,objects,details)
  m.controlledAt=m.latestControl.controlledAt
}
function renderProjectContext(){
  const el=$('#projectContext');if(!el)return
  const fromArt=project.source==='art'||Boolean(project.returnUrl)
  if(!project.projectId){
    if(!fromArt){
      el.hidden=true
      el.innerHTML=''
      if(projectSyncFailed)toast('Mise enregistrée ici · synchronisation locale à vérifier')
      return
    }
    const back=project.returnUrl?`<a id="artReturn" class="artReturn" href="${esc(project.returnUrl)}">Retour à ART</a>`:''
    el.hidden=false
    el.innerHTML=`<div class="artBridge"><p><b>MISES!</b><small>Ouvert depuis ART · aucun spectacle sélectionné · base locale autonome</small></p><div class="row">${back}</div></div>`
    if(projectSyncFailed)toast('Mise enregistrée ici · synchronisation locale à vérifier')
    return
  }
  const plan=planProjectOpen(mises, project)
  const label=project.projectName||project.projectId
  const attach=plan.action==='attach'?`<label>Une mise existe déjà ici, sans projet<select id="artAttach">${plan.candidates.map(m=>`<option value="${esc(m.id)}">${esc(m.name||'Mise')}</option>`).join('')}</select></label><button id="artAttachBtn" type="button">Rattacher</button>`:''
  const back=project.returnUrl?`<a id="artReturn" class="artReturn" href="${esc(project.returnUrl)}">Retour à ART</a>`:''
  el.hidden=false
  el.innerHTML=`<div class="artBridge"><p><b>${esc(label)}</b><small>Projet ART · les données restent dans MISES!, hors ligne</small></p><div class="row">${attach}<button id="artSummary" type="button" class="ghost">Exporter le résumé</button>${back}</div></div>`
  const attachBtn=$('#artAttachBtn')
  if(attachBtn)attachBtn.onclick=()=>attachExistingMise($('#artAttach').value)
  const summary=$('#artSummary')
  if(summary)summary.onclick=()=>downloadArtSummary()
  if(projectSyncFailed)toast('Mise enregistrée ici · synchronisation locale à vérifier')
}
function latestTouch(){
  return [...objects,...cases,...mises].map(x=>x.updatedAt||x.createdAt||'').filter(Boolean).sort().at(-1)||null
}
function downloadArtSummary(){
  const payload=makeArtLinkExport({
    projectId:project.projectId,
    projectName:project.projectName,
    objectCount:objects.length,
    caseCount:cases.length,
    updatedAt:latestTouch()
  })
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download='MISES-resume-art.json';document.body.append(a);a.click();a.remove()
  setTimeout(()=>URL.revokeObjectURL(url),2000)
}
async function attachExistingMise(id){
  const m=miseBy(id)
  if(!m||m.projectId)return
  linkToProject(m)
  await saveMise(m)
  activeMise=m.id
  await refresh()
  setTab('mises')
  renderProjectContext()
  toast('Mise rattachée à ce projet')
}
async function settleArtProject(){
  if(!project.projectId){renderProjectContext();return}
  const plan=planProjectOpen(mises, project)
  if(plan.action==='open'){
    activeMise=plan.mise.id
    setTab('mises')
  }else if(plan.action==='create'){
    const m=linkToProject({id:uid('mise'),name:plan.name,kitId:null,objectIds:[],checked:[],createdAt:new Date().toISOString()})
    await saveMise(m)
    activeMise=m.id
    await refresh()
    setTab('mises')
  }
  renderProjectContext()
}

const caseBy=id=>cases.find(c=>c.id===id)
const objectBy=id=>objects.find(o=>o.id===id)
const kitBy=id=>kits.find(k=>k.id===id)
const miseBy=id=>mises.find(m=>m.id===id)
const caseName=c=>c?`${c.name}${c.part&&c.total?` · ${c.part}/${c.total}`:''}`:'Sans contenant'
const dataBruitageCorpus=[
  ...(seed.web_reference_ideas||[]).map(x=>({...x,kind:'Idée / référence'})),
  ...(seed.pedagogy_patterns||[]).map(x=>({name:x.name,summary:x.summary,sounds:[],source:'Data Bruitage · pratiques',kind:'Pratique'})),
  ...(seed.intent_packs||[]).map(x=>({name:x.name,sounds:x.sound_queries||[],aliases:x.aliases||[],source:'Data Bruitage · intentions',kind:'Intention'})),
  ...(seed.sounds||[]).map(x=>({name:x.name,sounds:unique([...(x.aliases||[]),...(x.tags||[]),...(x.families||[])]),source:'Data Bruitage · lexique sonore',kind:'Son'})),
  ...(seed.musiques_en_jeux_game_index||[]).map(x=>({name:x.title,sounds:[],source:'Data Bruitage · jeux',kind:'Jeu'})),
  ...(seed.resource_index||[]).map(x=>({name:x.name,summary:x.indexed_text?'Document indexé':'Ressource',sounds:[],source:'Data Bruitage · documents',kind:'Document'}))
].filter(safeExternal)
const external=publicReferenceIdeas(publicFoley).filter(safeExternal)
const intents=seed.intent_packs||[]

function expandQuery(q){
  const nq=norm(q), extra=[]
  for(const i of intents){
    if([i.name,...(i.aliases||[])].some(a=>nq.includes(norm(a)))) extra.push(...(i.sound_queries||[]))
  }
  if(/mer|ocean|plage|bord de mer/.test(nq)) extra.push('ressac','vagues','vent','oiseaux','eau','mouette')
  if(/foret|bois/.test(nq)) extra.push('feuilles','branche','oiseau','vent','craquement','pas')
  if(/feu|cheminee/.test(nq)) extra.push('craquement','papier bulle','couverture de survie','brosse','brindilles')
  if(/orage|tempete/.test(nq)) extra.push('tonnerre','pluie','vent')
  return unique([q,...extra]).join(' ')
}

function searchOwned(q){
  if(!q.trim()) return []
  const enriched=objects.map(o=>({
    ...o,
    caseLabel:caseName(caseBy(o.caseId||o.container_id)),
    ...soundFields(o),
    searchText:[o.name,o.detectedName,o.hear,o.imagine,o.device,o.notes,...(o.sounds||[]),...(o.tags||[]),...(o.contexts||[]),o.family,caseName(caseBy(o.caseId||o.container_id))].join(' ')
  }))
  const fuse=new Fuse(enriched,{
    keys:[
      {name:'name',weight:.28},{name:'hear',weight:.2},{name:'imagine',weight:.16},{name:'sounds',weight:.14},{name:'tags',weight:.08},
      {name:'searchText',weight:.1},{name:'caseLabel',weight:.04}
    ],
    threshold:.44,ignoreLocation:true,includeScore:true
  })
  return fuse.search(expandQuery(q)).map(x=>({...x.item,_score:x.score})).sort((a,b)=>(Number(b.favorite)-Number(a.favorite))||(a._score-b._score)).slice(0,20)
}
function searchEntities(q){
  if(!q.trim()) return {cases:[],kits:[],mises:[]}
  const query=expandQuery(q)
  const caseHits=new Fuse(cases.map(c=>({...c,label:caseName(c),kind:'case',searchText:[c.name,c.notes,c.location,caseName(c)].filter(Boolean).join(' ')})),{keys:['name','label','notes','searchText'],threshold:.44,ignoreLocation:true,includeScore:true}).search(query).slice(0,6).map(x=>({...x.item,_score:x.score}))
  const kitHits=new Fuse(kits.map(k=>({...k,kind:'kit',searchText:[k.name,k.source,...(k.contexts||[]),...(k.objectIds||[]).map(id=>objectBy(id)?.name)].filter(Boolean).join(' ')})),{keys:['name','source','contexts','searchText'],threshold:.44,ignoreLocation:true,includeScore:true}).search(query).slice(0,6).map(x=>({...x.item,_score:x.score}))
  const miseHits=new Fuse(mises.map(m=>({...m,kind:'mise',searchText:[m.name,m.projectName,m.notes,...(m.objectIds||[]).map(id=>objectBy(id)?.name)].filter(Boolean).join(' ')})),{keys:['name','projectName','notes','searchText'],threshold:.44,ignoreLocation:true,includeScore:true}).search(query).slice(0,6).map(x=>({...x.item,_score:x.score}))
  return {cases:caseHits,kits:kitHits,mises:miseHits}
}
function searchExternal(q){
  if(!q.trim()) return []
  return new Fuse(external,{keys:['name','sounds','aliases','summary','source','kind'],threshold:.44,ignoreLocation:true})
    .search(expandQuery(q)).slice(0,8).map(x=>x.item)
}
function chip(s){return `<span class="chip">${esc(s)}</span>`}
function soundSummary(o){
  const fields=soundFields(o)
  const parts=[]
  if(fields.hear) parts.push(`Entendre : ${fields.hear}`)
  if(fields.imagine) parts.push(`Imaginer : ${fields.imagine}`)
  if((o.sounds||[]).length) parts.push((o.sounds||[]).slice(0,3).join(' · '))
  return parts.join(' · ')
}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)}

function companyMemberEmails(){
  const emails=[]
  try{
    const root=JSON.parse(localStorage.getItem('art-company-root-v1')||'{}')
    for(const member of root.members||[]) if(member?.email) emails.push(String(member.email).trim().toLowerCase())
    const registry=JSON.parse(localStorage.getItem('art-company-registry-v1')||'{}')
    const company=project.companyId&&registry?.companies?.[project.companyId]
    for(const member of company?.members||[]) if(member?.email) emails.push(String(member.email).trim().toLowerCase())
  }catch{}
  return unique(emails.filter(Boolean))
}
async function toggleFavorite(id){
  const o=objectBy(id);if(!o)return
  o.favorite=!o.favorite;o.updatedAt=new Date().toISOString();await db.put('objects',o);scheduleDriveSync();render();renderSearch();toast(o.favorite?'Ajouté aux favoris':'Retiré des favoris')
}
function findAlternatives(o){
  const queries=unique([...(o.sounds||[]),...(o.tags||[]),...(o.contexts||[])]).join(' ')
  if(!queries)return objects.filter(x=>x.id!==o.id).slice(0,8)
  const pool=objects.filter(x=>x.id!==o.id).map(x=>({...x,altText:[x.name,...(x.sounds||[]),...(x.tags||[]),...(x.contexts||[])].join(' ')}))
  return new Fuse(pool,{keys:['sounds','tags','contexts','name','altText'],threshold:.48,ignoreLocation:true}).search(queries).slice(0,8).map(x=>x.item)
}
function openAlternatives(id){
  const o=objectBy(id);if(!o)return
  const alts=findAlternatives(o),d=$('#modal')
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Alternatives à ${esc(o.name)}</b><small>Même fonction sonore ou usage proche</small></div><button id="closeAlt" class="ghost">×</button></div>${alts.length?alts.map(a=>`<article class="result"><div class="thumb">${a.photo?`<img src="${a.photo}">`:'≈'}</div><div><h3>${esc(a.name)}</h3><p>${(a.sounds||[]).slice(0,4).map(chip).join(' ')}</p><small>${esc(caseName(caseBy(a.caseId||a.container_id)))}</small></div><button data-altadd="${a.id}" class="plus">+</button></article>`).join(''):'<div class="empty">Pas encore d’alternative dans ta base.</div>'}</div>`
  d.showModal();$('#closeAlt').onclick=()=>d.close();$$('[data-altadd]',d).forEach(b=>b.onclick=()=>addToActiveMise(b.dataset.altadd))
}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
async function captureAudioMemo(o,button){
  const note=$('#audioNote')
  const showNote=text=>{if(note){note.hidden=false;note.textContent=text}}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){showNote('Enregistrement audio non disponible sur cet appareil.');toast('Enregistrement audio non disponible ici');return}
  let stream
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[],rec=new MediaRecorder(stream)
    button.disabled=true;button.textContent='● Enregistrement… toucher pour arrêter'
    const done=new Promise(resolve=>{rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=resolve})
    rec.start();let stopped=false;const stop=reason=>{if(stopped)return;stopped=true;if(reason)showNote(reason);try{rec.stop()}catch{}}
    button.onclick=()=>stop();const timer=setTimeout(()=>stop(),10000)
    const onHide=()=>{if(document.hidden)stop('Enregistrement interrompu.')}
    document.addEventListener('visibilitychange',onHide)
    stream.getTracks().forEach(track=>{track.onended=()=>stop('Le micro s’est arrêté. Enregistrement interrompu.')})
    await done;clearTimeout(timer);document.removeEventListener('visibilitychange',onHide);stream.getTracks().forEach(t=>t.stop())
    if(!chunks.length){button.disabled=false;button.textContent='Enregistrer un mémo sonore';showNote('Aucun son capté.');return}
    const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});o.audioMemo=await blobToDataUrl(blob);o.audioMemoAt=new Date().toISOString()
    button.disabled=false;button.textContent='Mémo sonore enregistré';toast('Mémo sonore ajouté · pense à enregistrer la fiche')
    const player=$('#audioMemoPlayer');if(player){player.hidden=false;player.src=o.audioMemo}
  }catch(error){
    stream?.getTracks().forEach(t=>t.stop());button.disabled=false;button.textContent='Enregistrer un mémo sonore'
    const denied=error?.name==='NotAllowedError'||error?.name==='SecurityError'
    const message=denied?'Permission micro refusée. La fiche reste utilisable sans mémo.':'Microphone indisponible.'
    showNote(message);toast(message)
  }
}
async function showObjectQr(o){await openEntityLabel('object', o)}
function pageOrigin(){return location.href.split('?')[0].split('#')[0]}
function sendSystemPrint(dataUrl, jobName){
  if(window.MisesAndroidPrinter&&typeof window.MisesAndroidPrinter.printWithSystem==='function'){
    window.MisesAndroidPrinter.printWithSystem(jobName||'MISES!', dataUrl)
    toast('Impression Android lancée')
    return 'android-print'
  }
  window.print()
  return 'window-print'
}
async function openEntityLabel(kind, entity, {next}={}){
  const name=kind==='case'?caseName(entity):(entity.name||'MISES!')
  const spec={name, shortId:shortId(entity.id), id:entity.id, qrText:entityUrl(pageOrigin(), kind, entity.id), location:kind==='object'?caseName(caseBy(entity.caseId||entity.container_id)):'', category:entity.family||entity.type||kind}
  const image=renderLabelDataUrl(spec)
  const d=$('#printDlg')
  d.innerHTML=`<div class="labelPreview"><img alt="Étiquette ${esc(name)}" src="${image}"><small>${esc(name)} · ${esc(spec.shortId)}</small></div><div class="row"><button id="systemPrint">Imprimer</button><button id="btPrint" class="ghost">${hasNativePrinter()?'Mini-imprimante':'Bluetooth'}</button>${next?'<button id="labelNext" type="button">Objet suivant</button>':''}<button id="closePrint" class="ghost">Fermer</button></div><p class="hint">L’impression passe par le service d’impression du téléphone. La mini-imprimante WalkPrint / YHK reste un essai à part, seulement si elle est vraiment là.</p>`
  d.showModal()
  $('#closePrint').onclick=()=>d.close()
  $('#systemPrint').onclick=()=>sendSystemPrint(image, name)
  $('#btPrint').onclick=async()=>{if(!hasNativePrinter())return pairPrinter();const saved=await db.get('settings','printer');if(!saved?.deviceId)return openNativePrinterDialog();await nativePrint(saved.deviceId,[image])}
  if(next) $('#labelNext').onclick=()=>{d.close();next()}
}
function scopedCaseSearch(c,q){
  const items=objects.filter(o=>(o.caseId||o.container_id)===c.id)
  if(!q.trim())return items
  return new Fuse(items.map(o=>({...o,txt:[o.name,...(o.sounds||[]),...(o.tags||[]),...(o.contexts||[])].join(' ')})),{keys:['name','sounds','tags','contexts','txt'],threshold:.48,ignoreLocation:true}).search(expandQuery(q)).map(x=>x.item)
}
function openCaseCreator(c){
  const d=$('#modal')
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Avec ce que j’ai ici</b><small>${esc(caseName(c))}</small></div><button id="closeCaseCreator" class="ghost">×</button></div><label>Ambiance / son<input id="caseCreatorQ" placeholder="mer, forêt, pluie, maison…"></label><div id="caseCreatorResults" class="cards"></div></div>`
  d.showModal();$('#closeCaseCreator').onclick=()=>d.close();const renderScoped=()=>{const q=$('#caseCreatorQ').value,found=scopedCaseSearch(c,q);$('#caseCreatorResults').innerHTML=found.map(o=>`<article class="card"><b>${esc(o.name)}</b><span>${(o.sounds||[]).slice(0,5).join(' · ')||'Usage à préciser'}</span><button data-caseadd="${o.id}">Ajouter à la mise</button></article>`).join('')||'<div class="empty">Rien de convaincant dans cette valise pour cette recherche.</div>';$$('[data-caseadd]',d).forEach(b=>b.onclick=()=>addToActiveMise(b.dataset.caseadd))};$('#caseCreatorQ').oninput=renderScoped;renderScoped()
}

function renderPublicSections(){
  const hub=$('#publicLibraryBody')
  if(hub){
    hub.innerHTML=publicHubHtml(publicFoley,esc)
    $('#publicRandomGame')?.addEventListener('click',()=>openPublicGame())
    $('#publicRandomUniverse')?.addEventListener('click',()=>openRandomPublicUniverse())
    $('#publicBuildWorkshop')?.addEventListener('click',()=>openPublicWorkshop())
  }
  const fabs=$('#fabricationCards')
  if(fabs){
    fabs.innerHTML=fabricationsHtml(publicFoley,esc)
    $$('[data-public-fab]',fabs).forEach(button=>button.onclick=()=>openPublicGame('public-fabrication'))
  }
  const acts=$('#activityCards')
  if(acts){
    acts.innerHTML=activitiesHtml(publicFoley,esc)
    $$('[data-public-activity]',acts).forEach(button=>button.onclick=()=>{
      const activity=(publicFoley.pedagogyActivities||[]).find(x=>x.id===button.dataset.publicActivity)
      openPublicGame(activity?.gameIds?.[0]||null)
    })
  }
}
function openPublicGame(gameId=null){
  let reveal=false
  let game=generatePublicGame(publicFoley,objects,{gameId})
  if(!game){toast('Jeu public indisponible');return}
  const d=$('#modal')
  const draw=()=>{
    d.innerHTML=`<div class="form">${publicGameHtml(game,esc,{reveal})}</div>`
    if(!d.open)d.showModal()
    d.querySelector('[data-play-close]')?.addEventListener('click',()=>d.close())
    d.querySelector('[data-public-game="solution"]')?.addEventListener('click',()=>{reveal=true;draw()})
    d.querySelector('[data-public-game="again"]')?.addEventListener('click',()=>{game=generatePublicGame(publicFoley,objects,{gameId});reveal=false;draw()})
  }
  draw()
}
function openRandomPublicUniverse(){
  const universe=randomPublicUniverse(publicFoley,objects)
  if(!universe){toast('Univers public indisponible');return}
  const game=generatePublicGame({...publicFoley,universeFrames:[universe.frame]},objects,{gameId:'public-random-universe'})
  if(game)openInventoryChallenge({},game)
}
function openPublicWorkshop(duration=30){
  const program=publicActivityProgram(publicFoley,objects,duration)
  const d=$('#modal');d.innerHTML=`<div class="form">${publicWorkshopHtml(program,esc)}</div>`;d.showModal()
  d.querySelector('[data-play-close]')?.addEventListener('click',()=>d.close())
}

function currentGameGraph(){
  return buildRelationGraph({objects,cases,sounds:catalogueSounds,objectSounds:catalogueObjectSounds})
}
function gameFiltersFromCase(containerId, extra={}){
  return {containerId:containerId||undefined,...extra}
}
function openPlayHub(containerId=null){
  const graph=currentGameGraph()
  const filters=gameFiltersFromCase(containerId)
  const summary=summarizeInventory(graph,filters)
  const label=containerId?caseName(caseBy(containerId)):'tout l’inventaire'
  const d=$('#modal')
  d.innerHTML=`<div class="form">${playHubHtml(summary,label,esc)}</div>`
  d.showModal()
  const close=()=>d.close()
  d.querySelector('[data-play-close]')?.addEventListener('click',close)
  d.querySelector('[data-play-action="challenge"]')?.addEventListener('click',()=>{d.close();openInventoryChallenge(filters)})
  d.querySelector('[data-play-action="workshop"]')?.addEventListener('click',()=>{d.close();openWorkshopFlow(filters,label)})
  d.querySelector('[data-play-action="universe"]')?.addEventListener('click',()=>{d.close();openInventoryChallenge({...filters,gameType:'E',universe:'forêt'})})
  d.querySelector('[data-play-action="surprise"]')?.addEventListener('click',()=>{d.close();openSurprise(filters)})
  d.querySelector('[data-play-action="public"]')?.addEventListener('click',()=>{d.close();openPublicGame()})
  d.querySelector('[data-play-action="random-universe"]')?.addEventListener('click',()=>{d.close();openRandomPublicUniverse()})
}
function openInventoryChallenge(filters={}, preset=null){
  const graph=currentGameGraph()
  let state={reveal:false,hintIndex:0,challenge:preset}
  if(!state.challenge){
    const out=generateChallenge(filters,{graph,objects,cases,learnings})
    if(!out.ok){toast(out.uncertain?.[0]||'Défi impossible');return}
    state.challenge=out.challenge
  }
  const render=()=>{
    const d=$('#modal')
    d.innerHTML=`<div class="form">${challengeHtml(state.challenge,esc,{reveal:state.reveal,hintIndex:state.hintIndex})}</div>`
    if(!d.open)d.showModal()
    d.querySelector('[data-play-close]')?.addEventListener('click',()=>d.close())
    d.querySelector('[data-chal="hint"]')?.addEventListener('click',()=>{state.hintIndex=Math.min((state.challenge.hints||[]).length,state.hintIndex+1);render()})
    d.querySelector('[data-chal="solution"]')?.addEventListener('click',()=>{state.reveal=true;render()})
    d.querySelector('[data-chal="validate"]')?.addEventListener('click',()=>{
      rememberGameEvent({kind:'challenge',id:state.challenge.id,fingerprint:state.challenge.fingerprint,gameType:state.challenge.gameType,foleyId:state.challenge.foleyId,objectIds:state.challenge.objectIds})
      toast('Défi validé · noté localement');d.close()
    })
    d.querySelector('[data-chal="next"]')?.addEventListener('click',()=>{
      rememberGameEvent({kind:'challenge',id:state.challenge.id,fingerprint:state.challenge.fingerprint,gameType:state.challenge.gameType,foleyId:state.challenge.foleyId,objectIds:state.challenge.objectIds})
      const out=generateChallenge(filters,{graph,objects,cases,learnings})
      if(!out.ok){toast(out.uncertain?.[0]||'Plus de défi');return}
      state={reveal:false,hintIndex:0,challenge:out.challenge};render()
    })
    d.querySelector('[data-chal="free"]')?.addEventListener('click',()=>{
      state.challenge={...state.challenge,prompt:state.challenge.prompt+' · variante libre',instruction:(state.challenge.instruction||'')+' Tu choisis le geste, sans objet hors inventaire.'}
      state.reveal=false;render()
    })
  }
  render()
}
function openWorkshopFlow(filters={}, label='Inventaire'){
  const d=$('#modal')
  let workshop=null, step=0, mode='setup'
  const draw=()=>{
    let html=''
    if(mode==='setup') html=workshopSetupHtml(label,esc)
    else if(mode==='program') html=workshopProgramHtml(workshop,esc)
    else html=workshopConductorHtml(workshop,step,esc)
    d.innerHTML=`<div class="form">${html}</div>`
    if(!d.open)d.showModal()
    d.querySelector('[data-play-close]')?.addEventListener('click',()=>d.close())
    d.querySelector('[data-ws="build"]')?.addEventListener('click',()=>{
      const duration=Number($('#wsDuration')?.value||30)
      const universe=$('#wsUniverse')?.value.trim()||undefined
      const groupSize=Number($('#wsGroup')?.value||1)
      const out=generateWorkshop({...filters,duration,universe,groupSize},{graph:currentGameGraph(),objects,cases,learnings})
      if(!out.ok){toast(out.uncertain?.[0]||'Atelier impossible');return}
      workshop=out.workshop;mode='program';draw()
      if(out.uncertain?.length)toast(out.uncertain[0])
    })
    d.querySelector('[data-ws="regen"]')?.addEventListener('click',()=>{mode='setup';draw()})
    d.querySelector('[data-ws="launch"]')?.addEventListener('click',()=>{
      rememberGameEvent({kind:'workshop',id:workshop.id,fingerprint:`ws:${workshop.id}`,objectIds:workshop.activities.flatMap(a=>a.objectIds||[])})
      step=0;mode='conduct';draw()
    })
    d.querySelector('[data-ws-nav="next"]')?.addEventListener('click',()=>{
      if(step>=(workshop.activities.length-1)){toast('Atelier terminé');d.close();return}
      step+=1;draw()
    })
    d.querySelector('[data-ws-nav="prev"]')?.addEventListener('click',()=>{if(step>0){step-=1;draw()}})
  }
  draw()
}
function openSurprise(filters={}){
  const out=surprisePick(filters,{graph:currentGameGraph(),objects,cases,learnings})
  if(out.kind==='challenge'&&out.challenge){openInventoryChallenge(filters,out.challenge);return}
  if(out.kind==='foley'){toast(`Surprise bruitage : ${out.foley.name}`);openInventoryChallenge({...filters,gameType:'A'},null);return}
  if(out.kind==='universe'){openInventoryChallenge({...filters,gameType:'E',universe:out.title||out.universeId});return}
  if(out.kind==='objects'){toast(`Surprise objets : ${(out.objects||[]).map(o=>o.name).join(', ')}`);return}
  toast('Surprise indisponible avec ce filtre')
}
function openChallenge(){
  openInventoryChallenge({})
}

function sharePayload({miseIds=[],kitIds=[],caseIds=[],objectIds=[],includeMedia=false}={}){
  const selectedMises=mises.filter(x=>miseIds.includes(x.id)),selectedKits=kits.filter(x=>kitIds.includes(x.id)),selectedCases=cases.filter(x=>caseIds.includes(x.id))
  const ids=new Set(objectIds)
  selectedMises.forEach(x=>(x.objectIds||[]).forEach(id=>ids.add(id)));selectedKits.forEach(x=>(x.objectIds||[]).forEach(id=>ids.add(id)));selectedCases.forEach(c=>objects.filter(o=>(o.caseId||o.container_id)===c.id).forEach(o=>ids.add(o.id)))
  const sharedObjects=objects.filter(o=>ids.has(o.id)).map(o=>{const x={...o};if(!includeMedia){delete x.photo;delete x.audioMemo;delete x.controlPhoto}return x})
  const referencedCases=cases.filter(c=>caseIds.includes(c.id)||sharedObjects.some(o=>(o.caseId||o.container_id)===c.id))
  return {version:1,kind:'mises-share',createdAt:new Date().toISOString(),project:project.projectId?{id:project.projectId,name:project.projectName,type:project.projectType}:null,includeMedia,objects:sharedObjects,cases:referencedCases,kits:selectedKits,mises:selectedMises}
}
function openShareDialog(){
  if(androidGoogleSignInBlocked()){explainAndroidGoogle();return}
  const d=$('#modal'),members=companyMemberEmails()
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Partager par QR</b><small>Seulement ce que tu sélectionnes</small></div><button id="closeShare" class="ghost">×</button></div>
  <p class="hint">Le paquet est créé séparément dans Drive. Ta base complète n’est jamais partagée.</p>
  <div class="shareColumns"><div><b>Mises</b>${mises.map(x=>`<label class="check"><input type="checkbox" data-share-mise value="${x.id}"><span>${esc(x.name)}</span></label>`).join('')||'<small>Aucune mise</small>'}</div><div><b>Kits</b>${kits.map(x=>`<label class="check"><input type="checkbox" data-share-kit value="${x.id}"><span>${esc(x.name)}</span></label>`).join('')||'<small>Aucun kit</small>'}</div><div><b>Valises</b>${cases.map(x=>`<label class="check"><input type="checkbox" data-share-case value="${x.id}"><span>${esc(caseName(x))}</span></label>`).join('')||'<small>Aucune valise</small>'}</div></div>
  <details><summary>Sélection d’objets</summary><div class="checklist">${objects.map(x=>`<label class="check"><input type="checkbox" data-share-object value="${x.id}"><span>${esc(x.name)}</span></label>`).join('')}</div></details>
  <label class="check"><input type="checkbox" id="shareMedia"><span>Inclure photos et mémos sonores</span></label>
  <label>Destinataires Google<textarea id="shareRecipients" rows="3" placeholder="prenom.nom@example.com, autre@example.com">${esc(members.join(', '))}</textarea></label>
  <button id="createShare">Créer le partage privé + QR</button><div id="shareResult"></div></div>`
  d.showModal();$('#closeShare').onclick=()=>d.close();$('#createShare').onclick=async()=>{const btn=$('#createShare');btn.disabled=true;try{const recipients=$('#shareRecipients').value.split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);if(!recipients.length)throw new Error('Ajoute au moins une adresse destinataire');const payload=sharePayload({miseIds:$$('[data-share-mise]:checked',d).map(x=>x.value),kitIds:$$('[data-share-kit]:checked',d).map(x=>x.value),caseIds:$$('[data-share-case]:checked',d).map(x=>x.value),objectIds:$$('[data-share-object]:checked',d).map(x=>x.value),includeMedia:$('#shareMedia').checked});if(!payload.objects.length&&!payload.mises.length&&!payload.kits.length&&!payload.cases.length)throw new Error('Sélectionne au moins un élément');const out=await createSharePackage(payload,recipients);const shareTarget=new URL(location.href);shareTarget.search='';shareTarget.hash='';shareTarget.searchParams.set('shareFile',out.file.id);const url=shareTarget.href,qr=await QRCode.toDataURL(url,{width:420,margin:2,errorCorrectionLevel:'M'});$('#shareResult').innerHTML=`<div class="shareDone"><img class="qr" src="${qr}"><b>${out.recipients.length} destinataire${out.recipients.length>1?'s':''}</b><small>Le QR ouvre uniquement ce paquet MISES!.</small><button id="shareNative">Partager le lien</button></div>`;$('#shareNative').onclick=async()=>{try{if(navigator.share)await navigator.share({title:'MISES!',text:'Partage MISES!',url});else{await navigator.clipboard.writeText(url);toast('Lien copié')}}catch{}};toast('Partage créé')}catch(error){toast(error instanceof Error?error.message:'Partage impossible')}finally{btn.disabled=false}}
}
async function openSharedPackage(fileId){
  if(androidGoogleSignInBlocked()){explainAndroidGoogle();return}
  const d=$('#modal')
  try{const pack=await loadSharePackage(fileId);d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Partage MISES!</b><small>${esc(pack.project?.name||'Sélection partagée')}</small></div><button id="closeShared" class="ghost">×</button></div>${(pack.mises||[]).map(m=>`<article class="card"><b>${esc(m.name)}</b><span>${(m.objectIds||[]).length} objets</span></article>`).join('')}${(pack.objects||[]).map(o=>`<article class="result"><div class="thumb">${o.photo?`<img src="${o.photo}">`:'◌'}</div><div><h3>${esc(o.name)}</h3><p>${(o.sounds||[]).slice(0,5).map(chip).join(' ')}</p><small>${esc(caseName((pack.cases||[]).find(c=>c.id===(o.caseId||o.container_id))))}</small>${o.audioMemo?`<audio controls src="${o.audioMemo}"></audio>`:''}</div></article>`).join('')}</div>`;d.showModal();$('#closeShared').onclick=()=>d.close()}catch(error){toast(error instanceof Error?error.message:'Partage inaccessible')}
}

$('#app').innerHTML=`
<header>
  <div class="brand miseBrand">
    <div class="miseBrandCopy"><div class="wordmark">${wordmarkSvg}</div><div class="sub">QR CASE FINDER</div><div class="tag">Cherche ta mise · <span id="appVersion">${APP_VERSION}</span></div></div>
  </div>
  <div class="headerTools">
    <span id="networkStatus" class="status" role="status"></span>
    <button id="undoBtn" class="headerChip" type="button" hidden>Annuler</button>
    <button id="printerBtn" class="headerChip" type="button">Imprimante · À connecter</button>
    <button id="preferencesBtn" class="headerIcon" type="button" aria-label="Préférences">⚙</button>
    <button id="manualBtn" class="headerIcon" type="button" aria-label="Mini-manuel">?</button>
    <button id="accountBtn" type="button" hidden>Google · Non connecté</button>
    <button id="backupBtn" type="button" hidden aria-label="Sauvegarder">⇩</button>
  </div>
</header>
<main>
<section id="projectContext" class="projectContext" aria-label="Contexte du projet" hidden></section>
<section class="hero">
  <label class="searchLabel" for="q">Recherche globale MISES!</label>
  <div class="searchbox"><input id="q" autocomplete="off" placeholder="Objet, son, ambiance, contenant, mise, kit…"><button id="mic" title="Dicter une recherche" aria-label="Dicter une recherche">Dicter</button></div>
  <div class="quick fieldShortcuts" aria-label="Raccourcis terrain">
    <button type="button" data-action="scan">Scanner un QR</button>
    <button type="button" data-action="photo">Ajouter une photo</button>
    <button type="button" data-action="inventory">Inventaire photo</button>
    <button type="button" data-action="last-mise">Dernière mise</button>
  </div>
</section>
<div class="goalNav" aria-label="Navigation MISES">
 <details open><summary>Trouver</summary><div><button class="foleyOnly" data-tab="creator">Créateur d’ambiance</button><button class="foleyOnly" data-tab="vibe">Vibe bruitage</button></div></details>
 <details class="createGoals"><summary>Créer</summary><div><span class="inventoryNavGroup inventoryOnly"><button id="goalAddObjectSimple" type="button">+ Objet</button><button id="goalAddCaseSimple" type="button">+ Contenant</button><button id="goalQrSimple" type="button">Étiquettes QR</button></span><button id="goalPlay" class="foleyOnly" type="button">Jouer</button><button id="goalWorkshop" class="foleyOnly" type="button">Préparer un atelier</button><button id="goalChallenge" class="foleyOnly" type="button">Défi bruitage</button><button id="goalPublic" class="foleyOnly" data-tab="publicLibrary" type="button">Bibliothèque publique</button><button id="goalFabrications" class="foleyOnly" data-tab="fabrications" type="button">Fabrications</button><button id="goalActivities" class="foleyOnly" data-tab="activities" type="button">Activités pédagogiques</button><button id="goalRandomUniverse" class="foleyOnly" type="button">Univers aléatoire</button><button id="goalHands" class="foleyOnly" type="button">Crée ton bruitage</button><button id="goalExercise" class="foleyOnly" type="button">Exercice</button><button id="goalGroupPhoto" class="foleyOnly" type="button">Photo de groupe</button><button id="goalUniverse" class="foleyOnly" type="button">Univers d’une photo</button></div></details>
 <details><summary>Ranger</summary><div><button data-tab="inventory">Objets & photos</button><button data-tab="cases">Valises & QR code</button><button id="goalMove" type="button">Déplacer par scans</button></div></details>
 <details><summary>Préparer</summary><div><button data-tab="kits">Kits</button><button data-tab="mises">Mises</button></div></details>
 <details><summary>Partager</summary><div><button id="goalShare" type="button">Partager par QR</button><button id="goalGoogle" type="button">Connexion Google</button><button id="goalPrinter" type="button">Imprimante</button><button id="goalBatchPrint" type="button">Créer / imprimer des QR</button><button id="goalManual" type="button">Mini-manuel</button><button id="goalDataBruitage" type="button">Data Bruitage · importer / exporter</button><button id="goalBackup" type="button">Sauvegarde</button><button id="goalRestore" type="button">Importer sauvegarde</button><button id="goalIosInstall" type="button" hidden>Installer sur iPhone</button></div></details>
</div>
<section id="search" class="tab active"><div id="searchResults"></div></section>
<section id="inventory" class="tab"><div class="sectionhead"><h2>Objets</h2><button id="addObject">+ Objet</button></div><div id="objectCards" class="cards"></div></section>
<section id="cases" class="tab"><div class="sectionhead"><h2>Valises & caisses</h2><button id="addCase">+ Contenant</button></div><p class="hint">Crée une valise ou une caisse, puis ouvre-la pour créer / imprimer son QR code. Ex. « Musique & percussions », « Vie quotidienne · 1/3 »…</p><div id="caseCards" class="cards"></div></section>
<section id="kits" class="tab"><div class="sectionhead"><h2>Kits</h2><button id="addKit">+ Kit</button></div><p class="hint">Un kit est un sous-ensemble de préparation : spectacle, atelier, tournée ou besoin ponctuel.</p><div id="kitCards" class="cards"></div></section>
<section id="mises" class="tab"><div class="miseSectionHead"><div><small>MISES ET CONTRÔLE</small><h2>Mises et contrôle</h2><p>Préparer, ouvrir et vérifier la mise du spectacle.</p></div><button id="addMise">+ Mise</button></div><div id="miseCards" class="cards miseCards"></div></section>
<section id="publicLibrary" class="tab foleyOnly"><div id="publicLibraryBody"></div></section>
<section id="fabrications" class="tab foleyOnly"><div id="fabricationCards"></div></section>
<section id="activities" class="tab foleyOnly"><div id="activityCards"></div></section>
<section id="vibe" class="tab foleyOnly"><div class="panel playful"><div class="tokenStrip" aria-hidden="true"><svg viewBox="0 0 360 52"><circle cx="28" cy="28" r="12"/><polygon points="108,10 132,22 124,46 93,46 84,22"/><polygon points="210,10 240,28 210,46 180,28"/><path d="M286 34c14-16 28-16 42 0s28 16 42 0"/></svg></div><h2>Vibe bruitage</h2><p>Décris un univers. MISES! reste hors ligne et sépare ce que tu possèdes de ce qui est seulement suggéré.</p><label>Univers<textarea id="vibePrompt" rows="3" placeholder="Une forêt inquiétante la nuit…"></textarea></label><div class="row"><button id="runVibe" type="button">Proposer</button><button type="button" class="ghost" data-vibe-preset="Une forêt inquiétante la nuit avec quelque chose qui rôde au loin">Forêt</button><button type="button" class="ghost" data-vibe-preset="Une vieille maison qui travaille pendant une tempête">Maison</button><button type="button" class="ghost" data-vibe-preset="un bateau en bois pris dans une mer violente">Bateau</button></div><div id="vibeOut"></div></div></section>
<section id="exercises" class="tab foleyOnly"><div class="panel playful"><div class="tokenStrip" aria-hidden="true"><svg viewBox="0 0 360 52"><circle cx="28" cy="28" r="12"/><polygon points="108,10 132,22 124,46 93,46 84,22"/><polygon points="210,10 240,28 210,46 180,28"/><path d="M286 34c14-16 28-16 42 0s28 16 42 0"/></svg></div><h2>Exercice</h2><p>Généré à partir de ta base. Ce n’est pas une liste figée, et ce n’est pas une fiche.</p><div class="grid2"><label>Durée<select id="exDuration"><option value="0.5">30 secondes</option><option value="1">1 min</option><option value="3">3 min</option><option value="5" selected>5 min</option></select></label><label>Personnes<input id="exPeople" type="number" min="1" value="1"></label><label>Niveau<select id="exLevel"><option value="découverte">Découverte</option><option value="atelier" selected>Atelier</option><option value="avancé">Avancé</option></select></label><label>Mode<select id="exMode"><option value="">Plusieurs modes</option><option value="decouverte">Découverte</option><option value="echauffement">Échauffement</option><option value="improvisation">Improvisation</option><option value="contrainte">Contrainte</option><option value="defi">Défi</option><option value="ambiance">Création d’ambiance</option><option value="histoire">Histoire sonore</option><option value="detournement">Détournement d’objet</option><option value="meme-objet">Même objet, plusieurs sons</option><option value="plusieurs-un-son">Plusieurs objets, un seul son</option></select></label></div><label>Univers (facultatif)<input id="exUniverse" placeholder="port, forêt, cuisine…"></label><button id="runExercise" type="button">Générer</button><div id="exerciseOut"></div></div></section>
<section id="creator" class="tab foleyOnly">
  <div class="panel"><h2>Créateur de bruitage</h2><p>Décrivez une ambiance ou un son pour explorer votre parc et les références.</p>
  <div class="row"><button data-preset="mer" class="ghost">Mer</button><button data-preset="forêt" class="ghost">Forêt</button><button data-preset="feu" class="ghost">Feu</button><button data-preset="orage" class="ghost">Orage</button></div></div>
  <div id="creatorResults"></div>
</section>
</main>

<input id="photoInput" type="file" accept="image/*" capture="environment" hidden>
<input id="galleryInput" type="file" accept="image/*" hidden>
<input id="groupPhotoInput" type="file" accept="image/*" capture="environment" hidden>
<input id="inventoryInput" type="file" accept="image/*" capture="environment" hidden>
<input id="handsPhotoInput" type="file" accept="image/*" capture="environment" hidden>
<input id="universePhotoInput" type="file" accept="image/*" capture="environment" hidden>
<input id="restoreInput" type="file" accept=".json" hidden>
<dialog id="modal"></dialog>
<dialog id="scanDlg"><div class="dialoghead"><strong>Caméra</strong><button id="stopScan" class="ghost">Fermer</button></div><video id="scanVideo" playsinline muted></video><p id="scanFeedback" class="scanFeedback" role="status">Cadre un QR. La lecture est continue, sans bouton déclencheur.</p><div class="row"><button id="scanObjects" type="button">Analyser les objets</button></div></dialog>
<dialog id="printDlg"></dialog>
<dialog id="preferencesDlg"><div class="form"><div class="dialoghead"><div><b>Préférences</b><small>Affichage · connexions · données</small></div><button id="closePreferences" class="ghost" type="button">×</button></div>
  <div class="grid2"><label><span>Interface</span><select id="interfaceMode"><option value="foley">Bruitages & pédagogie</option><option value="inventory">Inventaire / régie</option></select></label><label><span>Affichage</span><select id="displayMode"><option value="auto">Auto</option><option value="desktop">Ordinateur</option><option value="mobile">Mobile</option></select></label><label><span>Thème</span><select id="themeMode"><option value="system">Système</option><option value="dark">Sombre</option><option value="light">Clair</option><option value="regie">Mode régie</option></select></label></div><label><span>Catégories personnalisées</span><textarea id="customCategories" rows="3" placeholder="Costumes, accessoires, câbles, consommables…"></textarea></label>
  <fieldset class="inkPicker"><legend>Encre</legend><div id="inkSwatches" class="inkSwatches"></div><label>Couleur libre<input id="inkCustom" type="color" value="${DEFAULT_INK}"></label><button id="inkDefault" type="button" class="ghost">Couleur par défaut</button></fieldset>
  <div id="preferencesGoogleState" class="preferenceState"><b>Google Drive</b><span>Non connecté</span></div>
  <button id="preferencesGoogle" type="button">Raccorder Google Drive</button>
  <div id="folderDropZone" class="folderDropZone" tabindex="0"><b>Dossier de travail</b><span id="folderLinkState">Choisis un dossier local pour préparer un lot d’import. Aucun fichier source ne sera modifié.</span><input id="folderDropInput" type="file" webkitdirectory multiple hidden><button id="chooseFolder" type="button" class="ghost">Choisir un dossier</button></div>
  <div class="row"><button id="preferencesBackup" type="button" class="ghost">Sauvegarder</button><button id="preferencesRestore" type="button" class="ghost">Importer une sauvegarde</button></div>
  <button id="preferencesAbout" type="button" class="ghost">À propos</button>
</div></dialog>
<dialog id="aboutDlg"><div class="form aboutSheet"><div class="dialoghead"><div><b>À propos</b></div><button id="closeAbout" class="ghost" type="button">×</button></div>
<div class="wordmark aboutMark">${wordmarkSvg}</div>
<p class="aboutCredit">MISES! — Une création de ${externalAnchor(AUTHOR_WEBSITE_URL, 'Cédric Carboni', 'data-author')} pour ${externalAnchor(ACOUSMATIC_THEATRE_URL, 'Acousmatic Theatre')}</p>
<p class="aboutVersion muted">Version <span id="aboutVersion">${APP_VERSION}</span></p>
</div></dialog>
<dialog id="manualDlg"><div class="manual"><div class="dialoghead"><div><b>MISES! · Mini-manuel</b><small>QR Case Finder · prise en main rapide</small></div><button id="closeManual" class="ghost" type="button">×</button></div>
<div class="manualSteps">
<article><b>1 · Chercher une ambiance</b><span>Écris ou dicte « mer », « forêt », « vieille maison »… MISES! remonte vers tes sons, objets, photos et valises.</span></article>
<article><b>2 · Ajouter un objet</b><span>Photographie-le ou importe une photo, donne-lui ton nom personnel, ses sons et son contenant.</span></article>
<article><b>3 · Ranger</b><span>Crée une valise ou une caisse, nomme-la clairement puis imprime son QR.</span></article>
<article><b>4 · Préparer</b><span>Crée un kit ou une mise, éventuellement rattachée à un spectacle/EAC ART, puis coche ce qui est prêt.</span></article>
<article><b>5 · Contrôler</b><span>Scanne les QR ou utilise le contrôle photo avant départ / avant jeu. Toute proposition photo reste à valider humainement.</span></article>
<article><b>6 · Imprimer</b><span>Ouvre une valise → Étiquette / imprimer. L’impression système fonctionne partout ; Bluetooth direct dépend du protocole de l’imprimante.</span></article>
<article><b>7 · Travailler plus vite</b><span>Favoris, alternatives, photo de groupe, mémo sonore, déplacement par scans et impression en série sont dans les trois menus par objectif.</span></article>
<article><b>8 · Partager</b><span>« Partager par QR » crée un paquet séparé sur Drive avec seulement ce que tu sélectionnes. Photos et mémos sonores sont optionnels. Dans l’application Android, la connexion Google est désactivée : exporte une sauvegarde JSON, ou ouvre MISES! dans Chrome pour Drive.</span></article>
<article id="manualIos"><b>9 · iPhone / iPad</b><span>Dans Safari : bouton Partager → « Sur l’écran d’accueil » → garder « Ouvrir comme app Web » activé. Si ta base était déjà dans Safari, reconnecte Google ou importe une sauvegarde dans l’app installée.</span></article><article><b>10 · Confidentialité</b><span>Ta base personnelle n’est jamais incluse dans l’application publique. Les données de projet restent privées tant que tu ne les partages pas explicitement.</span></article>
</div><p class="manualNote">Le bouton ⇩ crée une sauvegarde locale de ta base.</p><p class="manualJoke">Toi aussi, tu as acheté une mini-imprimante thermique avec des oreilles de chat pour ta fille… puis tu t’es rendu compte que ce serait incroyablement pratique au boulot ? Voilà. MISES! est née à peu près comme ça.</p></div></dialog>
<div id="toast" role="status"></div>`

function renderNetworkStatus(){
  $('#networkStatus').textContent=navigator.onLine?'En ligne':'Hors ligne · données locales'
}
renderNetworkStatus()
window.addEventListener('online',renderNetworkStatus)
window.addEventListener('offline',renderNetworkStatus)

function setTab(t){
  $$('.tab').forEach(x=>x.classList.toggle('active',x.id===t))
  $$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===t))
  render()
}
$$('[data-tab]').forEach(b=>b.onclick=()=>{setTab(b.dataset.tab);if(b.dataset.tab==='creator')renderCreator()})

function renderSearch(target='#searchResults'){
  const q=$('#q').value.trim(), own=searchOwned(q), ideas=isInventoryMode()?[]:searchExternal(q), entities=searchEntities(q)
  const intent=parseIntent(q)
  const answer=intent?answerIntent(intent,{objects,cases,mises,activeMise,learnings}):null
  if(!q){
    $(target).innerHTML=isInventoryMode()?`<div class="empty"><b>Écris ce que tu cherches.</b><span>Objet, catégorie, contenant, mise ou kit.</span><small>Ex. « Où est le câble HDMI ? »</small></div>`:`<div class="empty"><b>Écris ce que tu cherches.</b><span>Objet, son, ambiance, contenant, mise, kit, ou une question.</span><small>Ex. « Où est mon truc pour faire le tonnerre ? »</small></div>`
    return
  }
  let h=answer?answerBlock(answer,esc):''
  const entityCount=entities.cases.length+entities.kits.length+entities.mises.length
  if(entityCount){
    h+=`<div class="resultHead"><b>${entityCount} contenant${entityCount>1?'s':''} · kit${entityCount>1?'s':''} · mise${entityCount>1?'s':''}</b><span>Accès direct depuis la recherche globale.</span></div>`
    h+=entities.cases.map(c=>`<article class="result entityResult"><div class="thumb">▣</div><div><h3>${esc(caseName(c))}</h3><p>Valise / caisse</p><small>${objects.filter(o=>(o.caseId||o.container_id)===c.id).length} objets</small></div><button data-open-case="${c.id}" class="plus" title="Ouvrir">↗</button></article>`).join('')
    h+=entities.kits.map(k=>`<article class="result entityResult"><div class="thumb">▦</div><div><h3>${esc(k.name)}</h3><p>Kit acoustique</p><small>${(k.objectIds||[]).length} objets · vue sur le parc</small></div><button data-open-kit="${k.id}" class="plus" title="Ouvrir">↗</button></article>`).join('')
    h+=entities.mises.map(m=>`<article class="result entityResult"><div class="thumb">◇</div><div><h3>${esc(m.name)}</h3><p>Mise</p><small>${(m.objectIds||[]).length} objets · ${(m.checked||[]).length} contrôlés${m.projectName?` · ${esc(m.projectName)}`:''}</small></div><button data-open-mise="${m.id}" class="plus" title="Ouvrir">↗</button></article>`).join('')
  }
  h+=`<div class="resultHead"><b>${own.length} résultat${own.length>1?'s':''} dans ton parc</b><span>Les idées externes restent séparées.</span></div>`
  h+=own.map(o=>`<article class="result">
    <div class="thumb">${o.photo?`<img src="${o.photo}">`:'◌'}</div>
    <div><h3>${esc(o.name)}</h3><p>${soundSummary(o)?esc(soundSummary(o)):'<span class="muted">Son à préciser</span>'}</p>
    <small>${esc(caseName(caseBy(o.caseId||o.container_id)))} · ${esc(o.family||'À classer')} · ${esc(provenanceLabel(o.provenance||'user-document'))}</small></div>
    <div class="resultActions"><button data-open="${o.id}" class="miniAction" title="Ouvrir la fiche">↗</button><button data-fav="${o.id}" class="miniAction" title="Favori">${o.favorite?'★':'☆'}</button><button data-alt="${o.id}" class="miniAction" title="Alternatives">≈</button><button data-add="${o.id}" class="plus">+</button></div></article>`).join('')
  if(ideas.length) h+=`<h3 class="ideaTitle">Idées à ajouter à ton parc</h3>`+ideas.map(i=>`<article class="result idea">
    <div class="thumb">·</div><div><h3>${esc(i.name)}</h3><p>${(i.sounds||[]).map(chip).join(' ')}</p>
    <small>Source externe · ${esc(i.source||'base de référence')} · pas un document de l’utilisateur</small></div><button class="plus" data-idea="${esc(i.name)}">+</button></article>`).join('')
  $(target).innerHTML=h
  $$('[data-open]',$(target)).forEach(b=>b.onclick=()=>openObject(objectBy(b.dataset.open)||{id:b.dataset.open}))
  $$('[data-add]',$(target)).forEach(b=>b.onclick=()=>addToActiveMise(b.dataset.add))
  $$('[data-fav]',$(target)).forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.fav))
  $$('[data-alt]',$(target)).forEach(b=>b.onclick=()=>openAlternatives(b.dataset.alt))
  $$('[data-idea]',$(target)).forEach(b=>b.onclick=()=>openObject({name:b.dataset.idea,source:'suggestion externe',owned:false}))
  $$('[data-open-case]',$(target)).forEach(b=>b.onclick=()=>showCase(b.dataset.openCase))
  $$('[data-open-kit]',$(target)).forEach(b=>b.onclick=()=>showKit(b.dataset.openKit))
  $$('[data-open-mise]',$(target)).forEach(b=>b.onclick=()=>{const m=miseBy(b.dataset.openMise);if(m){activeMise=m.id;setTab('mises');openMise(m)}})
  const scanExercise=$('#doScanExercise',$(target))
  if(scanExercise) scanExercise.onclick=()=>{pendingExerciseMinutes=answer?.minutes||5;$('#handsPhotoInput').click()}
}
$('#q').addEventListener('input',()=>{setTab('search');renderSearch()})
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter'){setTab('search');renderSearch()}})

async function resizePhoto(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(),u=URL.createObjectURL(file)
    img.onload=()=>{const max=1200,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas')
      c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height)
      URL.revokeObjectURL(u);resolve(c.toDataURL('image/jpeg',.76))}
    img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Image illisible'))};img.src=u
  })
}
async function runLocalPhoto(file,mise=null,mode='control'){
  if(!file?.type?.startsWith('image/')){toast('Sélectionnez une image');return}
  const minutes=pendingExerciseMinutes||1
  try{await openLocalPhoto({file,db,mise,resizePhoto,mode,durationMin:minutes,saved:async (next,created)=>{
    if(next)publishProject(next)
    await refresh();render()
    for(const row of created||[]) if(row.fresh) undoStack.push({store:'objects',id:row.id})
    if(undoStack.length) $('#undoBtn').hidden=false
    if(mode==='inventory'&&created?.length){
      toast('Fiche enregistrée sur cet appareil')
      await openEntityLabel('object', objectBy(created[0].id)||created[0], {next:()=>$('#inventoryInput').click()})
    }else toast('Validations enregistrées sur cet appareil')
  }})}catch(error){toast(error instanceof Error?error.message:'Photo illisible')}
}
const groupPhotoFlow=file=>runLocalPhoto(file,null,'group')
async function photoFlow(file){
  const target=miseBy(photoTargetMiseId);photoTargetMiseId=null
  await runLocalPhoto(file,target)
}
$('#goalDataBruitage').onclick=()=>openDataBruitage({db,changed:async()=>{await refresh();render()}})
$('#groupPhotoInput').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)groupPhotoFlow(file)}

for(const id of ['photoInput','galleryInput']){
  $("#"+id).onchange=e=>{const file=e.target.files[0];e.target.value='';if(file)photoFlow(file)}
  $("#"+id).addEventListener('cancel',()=>{photoTargetMiseId=null})
}
function pickPhoto(inputId,miseId=null){
  photoTargetMiseId=miseId
  $('#'+inputId).click()
}

function openObject(p={}){
  const current=p.id?objects.find(o=>o.id===p.id):null
  const o=current||{id:uid('obj'),name:p.name||'',detectedName:'',sounds:p.sounds||[],hear:p.hear||'',imagine:p.imagine||'',device:p.device||'',notes:p.notes||'',tags:[],contexts:[],photo:p.photo||'',caseId:'',family:p.family||'À classer',source:p.source||'manuel',owned:p.owned??true,status:p.status||'available',provenance:p.provenance||(p.owned===false?'external':'user-document')}
  const shown=soundFields(current||o)
  const m=$('#modal')
  m.innerHTML=`<form method="dialog" class="form"><div class="dialoghead"><div><b>${current?'Modifier':'Ajouter'} un objet</b><small>${esc(provenanceLabel(o.provenance||'user-document'))}</small></div><button value="cancel" class="ghost">×</button></div>
  ${o.photo?`<img class="photoPreview" src="${o.photo}">`:''}
  <div class="objectQuick"><button type="button" id="favObject" class="ghost">${o.favorite?'★ Favori':'☆ Favori'}</button>${current?'<button type="button" id="qrObject" class="ghost">QR objet</button>':''}<button type="button" id="audioMemo" class="ghost">${o.audioMemo?'Réenregistrer mémo sonore':'Enregistrer un mémo sonore'}</button></div>
  <p id="audioNote" class="hint" role="status" ${o.audioMemo?'hidden':''}>${o.audioMemo?'':'Aucun mémo sonore pour cette fiche.'}</p>
  <audio id="audioMemoPlayer" controls data-memo ${o.audioMemo?'':'hidden'}></audio>
  <label>Nom<input id="fName" value="${esc(o.name)}" placeholder="Bouteille fictive"></label>
  <label class="foleyOnly">Son à entendre<input id="fHear" value="${esc(shown.hear)}" placeholder="glouglou fictif"></label>
  <label class="foleyOnly">Son à imaginer<input id="fImagine" value="${esc(shown.imagine)}" placeholder="océan imaginé fictif"></label>
  <label class="foleyOnly">Objet ou dispositif nécessaire<input id="fDevice" value="${esc(o.device||'')}" placeholder="bouteille en verre fictive"></label>
  <div class="grid2"><label>Famille<select id="fFamily">${currentCategories().map(x=>`<option ${o.family===x?'selected':''}>${x}</option>`)}</select></label>
  <label>Contenant<select id="fCase"><option value="">Sans contenant</option>${cases.map(c=>`<option value="${c.id}" ${(o.caseId||o.container_id)===c.id?'selected':''}>${esc(caseName(c))}</option>`)}</select></label></div>
  <label>Usages déjà saisis, distincts des deux sons<input id="fSounds" value="${esc((o.sounds||[]).join(', '))}" placeholder="liste libre, non fusionnée"></label>
  <label>Notes<textarea id="fNotes" rows="3">${esc(o.notes||'')}</textarea></label>
  <div class="grid2"><label>Origine<select id="fProvenance">${Object.entries(PROVENANCE).map(([key,label])=>`<option value="${key}" ${(o.provenance||'user-document')===key?'selected':''}>${esc(label)}</option>`).join('')}</select></label>
  <label>Statut<select id="fStatus">${[...OBJECT_STATUSES,...(o.status&&!OBJECT_STATUSES.some(([k])=>k===o.status)?[[o.status,o.status]]: [])].map(([key,label])=>`<option value="${key}" ${(o.status||'available')===key?'selected':''}>${esc(label)}</option>`).join('')}</select></label></div>
  <label>Tags / contexte<input id="fTags" value="${esc(unique([...(o.tags||[]),...(o.contexts||[])]).join(', '))}" placeholder="atelier, kit perso, #spectacle…"></label>
  ${(o.locationHistory||[]).length?`<details><summary>Historique de rangement</summary><div class="historyList">${(o.locationHistory||[]).slice().reverse().slice(0,12).map(h=>`<small>${esc(new Date(h.at).toLocaleString('fr-FR'))} · ${esc(caseName(caseBy(h.from)))} → ${esc(caseName(caseBy(h.to)))}</small>`).join('')}</div></details>`:''}
  <div class="row"><button type="button" id="pickGallery" class="ghost">Importer photo</button><button type="button" id="pickCamera" class="ghost">Appareil photo</button><button id="saveObject">Enregistrer</button></div></form>`
  m.showModal()
  $('#pickGallery').onclick=()=>pickPhoto('galleryInput')
  $('#pickCamera').onclick=()=>pickPhoto('photoInput')
  $('#favObject').onclick=()=>{o.favorite=!o.favorite;$('#favObject').textContent=o.favorite?'★ Favori':'☆ Favori'}
  if($('#qrObject'))$('#qrObject').onclick=()=>showObjectQr(o)
  $('#audioMemo').onclick=e=>captureAudioMemo(o,e.currentTarget)
  const player=$('#audioMemoPlayer')
  if(player){
    player.onerror=()=>{player.hidden=true;const note=$('#audioNote');if(note){note.hidden=false;note.textContent='Fichier sonore absent ou illisible.'}}
    if(o.audioMemo) player.src=o.audioMemo
  }
  $('#saveObject').onclick=async e=>{
    e.preventDefault()
    const tags=$('#fTags').value.split(',').map(x=>x.trim()).filter(Boolean)
    const previousCase=current?(current.caseId||current.container_id||''):(o.caseId||o.container_id||''),nextCase=$('#fCase').value
    if(previousCase!==nextCase)o.locationHistory=[...(o.locationHistory||[]),{at:new Date().toISOString(),from:previousCase,to:nextCase,method:'fiche'}]
    const previousSounds=o.sounds
    assignSoundFields(o,$('#fHear').value.trim(),$('#fImagine').value.trim())
    Object.assign(o,{
      name:$('#fName').value.trim()||'Objet sans nom',
      family:$('#fFamily').value,
      device:$('#fDevice').value.trim(),
      notes:$('#fNotes').value.trim(),
      provenance:$('#fProvenance').value,
      status:$('#fStatus').value,
      caseId:nextCase,container_id:nextCase,
      sounds:previousSounds,
      tags,contexts:tags,updatedAt:new Date().toISOString()
    })
    o.sounds=$('#fSounds').value.split(',').map(x=>x.trim()).filter(Boolean)
    await db.put('objects',o);scheduleDriveSync();m.close();await refresh();render();toast('Objet enregistré')
  }
}
$('#addObject').onclick=()=>openObject()

function openCase(c){
  c=c||{id:uid('case'),name:'',part:null,total:null,type:'Valise'}
  const m=$('#modal')
  m.innerHTML=`<form method="dialog" class="form"><div class="dialoghead"><b>${caseBy(c.id)?'Modifier':'Créer'} un contenant</b><button value="cancel" class="ghost">×</button></div>
  <label>Nom<input id="cName" value="${esc(c.name)}" placeholder="Vie quotidienne"></label>
  <div class="grid2"><label>N° série<input id="cPart" type="number" min="1" value="${c.part||''}" placeholder="1"></label><label>Total<input id="cTotal" type="number" min="1" value="${c.total||''}" placeholder="3"></label></div>
  <label>Type<select id="cType">${['Caisse','Valise','Boîte','Bac','Sac','Flight-case','Trousse'].map(x=>`<option ${norm(c.type)===norm(x)?'selected':''}>${x}</option>`)}</select></label>
  <button id="saveCase">Enregistrer</button></form>`
  m.showModal()
  $('#saveCase').onclick=async e=>{
    e.preventDefault()
    Object.assign(c,{name:$('#cName').value.trim()||'Contenant',part:+$('#cPart').value||null,total:+$('#cTotal').value||null,type:$('#cType').value})
    await db.put('cases',c);scheduleDriveSync();m.close();await refresh();render();toast(caseName(c)+' enregistré')
  }
}
$('#addCase').onclick=()=>openCase()

async function showCase(id){
  const c=caseBy(id);if(!c)return
  const items=objects.filter(o=>(o.caseId||o.container_id)===id)
  const url=entityUrl(location.href,'case',id)
  const qr=await QRCode.toDataURL(url,{width:520,margin:2,errorCorrectionLevel:'M'})
  const mise=miseBy(activeMise)
  const missing=mise?(mise.objectIds||[]).map(objectBy).filter(o=>o&&(o.caseId||o.container_id)!==id):[]
  const elsewhere=objects.filter(o=>(o.caseId||o.container_id)!==id)
  const m=$('#modal')
  m.innerHTML=`<div class="caseView"><div class="dialoghead"><div><b>${esc(caseName(c))}</b><small>${items.length} objet${items.length>1?'s':''}</small></div><button class="ghost" id="closeCase">×</button></div>
  <img class="qr" src="${qr}" alt="QR de ${esc(caseName(c))}"><code>${esc(c.id)}</code>
  <div class="miniList">${items.map(o=>`<span>${esc(o.name)} <button type="button" data-remove-object="${o.id}" class="ghost">Retirer</button></span>`).join('')||'<span>Aucun objet dans cette caisse.</span>'}</div>
  <label>Ajouter un objet<select id="caseAddObject"><option value="">Choisir</option>${elsewhere.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></label>
  <p class="hint">${missing.length?`Dans la mise active, pas dans cette caisse : ${missing.map(o=>`${esc(o.name)} (${esc(caseName(caseBy(o.caseId||o.container_id)))})`).join(', ')}`:'Contrôle : rien de la mise active ne manque ici, ou aucune mise n’est active.'}</p>
  <p class="playStats" id="casePlayStats"></p>
  <div class="row playCtas"><button type="button" id="casePlay">Jouer</button><button type="button" id="caseWorkshop">Atelier</button><button type="button" id="caseDefi" class="ghost">Défi</button><button type="button" id="caseSurprise" class="ghost">Surprise</button></div>
  <div class="row"><button id="caseCreator">Avec ce que j’ai ici</button><button id="printLabel">Créer / imprimer le QR</button><button id="scanNext" type="button" class="ghost">Scanner le suivant</button><button id="editCase" class="ghost">Modifier</button></div></div>`
  m.showModal()
  {const sum=summarizeInventory(currentGameGraph(),{containerId:id});const el=$('#casePlayStats');if(el)el.innerHTML=`<b>${sum.foleyCount}</b> bruitage${sum.foleyCount>1?'s':''} et <b>${sum.gameTypeCount}</b> type${sum.gameTypeCount>1?'s':''} de jeu avec cette valise · ${sum.objectCount} objet${sum.objectCount>1?'s':''} dispo`}
  $('#closeCase').onclick=()=>m.close()
  $('#casePlay').onclick=()=>{m.close();openPlayHub(id)}
  $('#caseWorkshop').onclick=()=>{m.close();openWorkshopFlow({containerId:id},caseName(c))}
  $('#caseDefi').onclick=()=>{m.close();openInventoryChallenge({containerId:id})}
  $('#caseSurprise').onclick=()=>{m.close();openSurprise({containerId:id})}
  $('#caseCreator').onclick=()=>{m.close();openCaseCreator(c)}
  $('#printLabel').onclick=()=>openEntityLabel('case', c)
  $('#scanNext').onclick=()=>{m.close();startScan()}
  $('#editCase').onclick=()=>{m.close();openCase(c)}
  $('#caseAddObject').onchange=async event=>{
    const o=objectBy(event.target.value);if(!o)return
    const from=o.caseId||o.container_id||''
    o.locationHistory=[...(o.locationHistory||[]),{at:new Date().toISOString(),from,to:id,method:'caisse'}]
    o.caseId=id;o.container_id=id;o.updatedAt=new Date().toISOString()
    await db.put('objects',o)
    await db.put('learnings',newLearning({kind:'location',objectId:o.id,caseId:id,label:o.name,note:`${o.name} → ${caseName(c)}`}))
    scheduleDriveSync();await refresh();m.close();showCase(id);toast(`${o.name} → ${caseName(c)}`)
  }
  $$('[data-remove-object]',m).forEach(button=>button.onclick=async()=>{
    const o=objectBy(button.dataset.removeObject);if(!o)return
    const from=o.caseId||o.container_id||''
    o.locationHistory=[...(o.locationHistory||[]),{at:new Date().toISOString(),from,to:'',method:'caisse'}]
    o.caseId='';o.container_id='';o.updatedAt=new Date().toISOString()
    await db.put('objects',o);scheduleDriveSync();await refresh();m.close();showCase(id);toast(`${o.name} retiré de ${caseName(c)}`)
  })
}
async function showKit(id){
  const k=kitBy(id);if(!k)return
  const url=entityUrl(location.href,'kit',id)
  const qr=await QRCode.toDataURL(url,{width:520,margin:2,errorCorrectionLevel:'M'})
  const items=(k.objectIds||[]).map(objectBy).filter(Boolean)
  const m=$('#modal')
  m.innerHTML=`<div class="caseView"><div class="dialoghead"><div><b>${esc(k.name)}</b><small>Kit · une vue, pas toute la base</small></div><button class="ghost" id="closeKit">×</button></div><img class="qr" src="${qr}" alt="QR du kit"><div class="miniList">${items.map(o=>`<span>${esc(o.name)}</span>`).join('')||'<span>Aucun objet</span>'}</div><button id="printKit">Étiquette / imprimer</button></div>`
  m.showModal();$('#closeKit').onclick=()=>m.close();$('#printKit').onclick=()=>openEntityLabel('kit', k)
}

function openKit(k){
  k=k||{id:uid('kit'),name:'',description:'',objectIds:[],contexts:[],showId:null,source:'manuel'}
  const m=$('#modal')
  m.innerHTML=`<form method="dialog" class="form"><div class="dialoghead"><b>${kitBy(k.id)?'Modifier':'Créer'} un kit</b><button value="cancel" class="ghost">×</button></div>
  <label>Nom<input id="kName" value="${esc(k.name)}" placeholder="Kit spectacle / atelier"></label>
  <label>Description<input id="kDesc" value="${esc(k.description||'')}" placeholder="Kit perso, atelier…"></label>
  <label>Contexte (facultatif)<input id="kCtx" value="${esc((k.contexts||[]).join(', '))}" placeholder="atelier, #spectacle…"></label>
  <div class="checklist">${objects.map(o=>`<label class="check"><input type="checkbox" value="${o.id}" ${(k.objectIds||[]).includes(o.id)?'checked':''}><span>${esc(o.name)}</span></label>`).join('')}</div>
  <button id="saveKit">Enregistrer</button></form>`
  m.showModal()
  $('#saveKit').onclick=async e=>{
    e.preventDefault()
    k.name=$('#kName').value.trim()||'Kit'
    k.description=$('#kDesc').value.trim()
    k.contexts=$('#kCtx').value.split(',').map(x=>x.trim()).filter(Boolean)
    k.objectIds=$$('.check input:checked',m).map(x=>x.value)
    k.updatedAt=new Date().toISOString()
    await db.put('kits',k);scheduleDriveSync();m.close();await refresh();render();toast('Kit enregistré')
  }
}
$('#addKit').onclick=()=>openKit()

async function createMiseFromKit(kit){
  const m=linkToProject({id:uid('mise'),name:`${kit.name} · ${new Date().toLocaleDateString('fr-FR')}`,kitId:kit.id,objectIds:[...(kit.objectIds||[])],checked:[],createdAt:new Date().toISOString()})
  await saveMise(m);activeMise=m.id;await refresh();setTab('mises');toast('Mise créée')
}
function openMise(m){
  m=m?{...m}:linkToProject({id:uid('mise'),name:'',kitId:null,objectIds:[],checked:[],createdAt:new Date().toISOString()})
  const d=$('#modal')
  d.innerHTML=`<form method="dialog" class="form"><div class="dialoghead"><b>${miseBy(m.id)?'Modifier':'Créer'} une mise</b><button value="cancel" class="ghost">×</button></div>
  <label>Nom<input id="mName" value="${esc(m.name)}" placeholder="Atelier mer demain"></label>
  <p class="hint">${m.projectId?`Projet lié : ${esc(m.projectName||m.projectId)}`:'Mise indépendante · Data Bruitage global'}</p>
  <label>Partir d'un kit<select id="mKit"><option value="">Aucun</option>${kits.map(k=>`<option value="${k.id}" ${m.kitId===k.id?'selected':''}>${esc(k.name)}</option>`)}</select></label>
  <button id="saveMise">Créer / enregistrer</button></form>`
  d.showModal()
  $('#saveMise').onclick=async e=>{
    e.preventDefault()
    const kit=kitBy($('#mKit').value)
    m.name=$('#mName').value.trim()||'Mise'
    m.kitId=kit?.id||null
    if(kit && !(m.objectIds||[]).length) m.objectIds=[...(kit.objectIds||[])]
    m.objectIds=m.objectIds||[];m.checked=m.checked||[]
    await saveMise(m);activeMise=m.id;d.close();await refresh();render();toast('Mise enregistrée')
  }
}
$('#addMise').onclick=()=>openMise()

async function addToActiveMise(id){
  let m=miseBy(activeMise)
  if(!m){m=linkToProject({id:uid('mise'),name:'Mise rapide',kitId:null,objectIds:[],checked:[],createdAt:new Date().toISOString()})}
  m.objectIds=unique([...(m.objectIds||[]),id])
  await saveMise(m);activeMise=m.id;await refresh();render();toast('Ajouté à '+(m.name||'la mise'))
}
async function toggleCheck(m,id,yes){
  m.checked=m.checked||[]
  m.checked=yes?unique([...m.checked,id]):m.checked.filter(x=>x!==id)
  recordControl(m,{method:'manual'})
  await saveMise(m);render()
}

function showLatestControl(m){
  const c=m.latestControl;if(!c)return
  const d=$('#modal')
  const methods={'photo-local':'Photo locale et validation humaine',manual:'Liste manuelle','manual-photo':'Liste manuelle avec photo','photo-assisted':'Photo et validation humaine'}
  const statuses={available:'Propositions reçues',unavailable:'Service indisponible',cancelled:'Analyse interrompue pour validation manuelle','not-requested':'Non demandée'}
  d.innerHTML=`<div class="form"><div class="dialoghead"><b>Dernier contrôle enregistré</b><button class="ghost" id="closeControl">Fermer</button></div>
    <h2>${esc(c.miseName)}</h2><p class="hint">${esc(c.controlledAt)} · ${esc(methods[c.method]||c.method)}</p>
    <p>${c.checkedCount} / ${c.objectCount} objets contrôlés par validation humaine.</p>
    <p class="hint">Projet au moment du contrôle : ${esc(c.projectName||c.projectId||'Indépendant')}<br>Analyse : ${esc(statuses[c.analysisStatus]||c.analysisStatus)}${c.analysisError?` · ${esc(c.analysisError)}`:''}${c.analysedAt?`<br>Réponse reçue : ${esc(c.analysedAt)}`:''}</p>
    ${c.file?`<p class="hint">Image originale : ${esc(c.file.name)} · ${esc(c.file.type)} · ${c.file.size} octets${c.file.lastModified?`<br>Fichier modifié : ${esc(new Date(c.file.lastModified).toISOString())}`:''}</p>`:''}
    <div class="checklist">${c.expectedObjects.map(o=>`<p>${c.checkedObjectIds.includes(o.id)?'Vérifié':'Non vérifié'} · ${esc(o.name)} <small>${esc(o.id)}</small></p>`).join('')||'<p>Aucun objet attendu lors de ce contrôle.</p>'}</div>
    <h3>Propositions examinées</h3><div class="checklist">${c.detectedObjects.map(o=>`<p>${esc(o.name)} · ${o.validated?'Confirmée par l’utilisateur':'Non confirmée'}${o.confidence!==undefined?` <small>Score du service : ${Math.round(o.confidence*100)} %</small>`:''}</p>`).join('')||'<p>Aucune proposition.</p>'}</div>
    <p class="hint">Ce relevé conserve l’état au moment du contrôle. La mise peut avoir été modifiée depuis. Le relevé est inclus dans la sauvegarde.</p></div>`
  d.showModal();$('#closeControl').onclick=()=>d.close()
}

function hasNativePrinter(){return Boolean(window.MisesAndroidPrinter&&typeof window.MisesAndroidPrinter.listPairedPrinters==='function')}
function nativePrinterDevices(){
  if(!hasNativePrinter())return[]
  try{return JSON.parse(window.MisesAndroidPrinter.listPairedPrinters()||'[]').sort((a,b)=>Number(b.likelyPrinter)-Number(a.likelyPrinter))}catch{return[]}
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
function wrapCanvasText(ctx,text,maxWidth){
  const words=String(text||'').split(/\s+/),lines=[];let line=''
  for(const word of words){const next=(line+' '+word).trim();if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word}else line=next}
  if(line)lines.push(line);return lines
}
async function makeThermalLabel({title='MISES!',qrDataUrl='',subtitle='',logoOnly=false}){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=logoOnly?190:500
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';ctx.textAlign='center'
  ctx.font='900 70px Arial, sans-serif';ctx.fillText('MISES!',192,82)
  ctx.font='700 18px Arial, sans-serif';ctx.fillText('QR CASE FINDER',192,112)
  if(logoOnly){ctx.font='16px Arial, sans-serif';ctx.fillText('Test imprimante · MISES!',192,154);return canvas.toDataURL('image/png')}
  ctx.fillRect(28,132,328,3)
  if(title&&title!=='MISES!'){ctx.font='700 22px Arial, sans-serif';const lines=wrapCanvasText(ctx,title,330).slice(0,2);lines.forEach((line,i)=>ctx.fillText(line,192,168+i*26))}
  let qrTop=title&&title!=='MISES!'?220:165
  if(qrDataUrl){const qr=await loadImage(qrDataUrl);ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,72,qrTop,240,240)}
  if(subtitle){ctx.font='14px Arial, sans-serif';const lines=wrapCanvasText(ctx,subtitle,340).slice(0,2);lines.forEach((line,i)=>ctx.fillText(line,192,qrTop+270+i*18))}
  return canvas.toDataURL('image/png')
}
async function makePrinterTestImages(){
  const target=location.href.split('?')[0].split('#')[0]
  const qr=await QRCode.toDataURL(target,{width:280,margin:1,errorCorrectionLevel:'M'})
  return [await makeThermalLabel({logoOnly:true}),await makeThermalLabel({title:'MISES!',qrDataUrl:qr,subtitle:'Scanne pour ouvrir MISES!'})]
}
async function nativePrint(address,images){
  if(!hasNativePrinter()){toast('Le pilote natif est disponible dans l’app Android MISES!');return false}
  if(!address){toast('Choisis d’abord une imprimante');return false}
  try{window.MisesAndroidPrinter.printImages(address,JSON.stringify(images));return true}catch(error){toast('Impossible de lancer l’impression native');return false}
}
async function openNativePrinterDialog(){
  const d=$('#modal'),devices=nativePrinterDevices(),saved=await db.get('settings','printer')
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Imprimante thermique</b><small>WalkPrint / YHK · pilote Android expérimental</small></div><button id="closeNativePrinter" class="ghost">×</button></div>
  <p class="hint">Jumelle d’abord l’imprimante dans Android. Les modèles WalkPrint de cette famille apparaissent souvent comme « YHK-… » ou « Mini Printer ».</p>
  <div class="printerDevices">${devices.map(device=>`<button class="printerDevice ${saved?.deviceId===device.address?'selected':''}" data-native-printer="${esc(device.address)}" data-native-name="${esc(device.name)}"><b>${device.likelyPrinter?'● ':''}${esc(device.name)}</b><small>${esc(device.address)}${device.likelyPrinter?' · profil probable WalkPrint/YHK':''}</small></button>`).join('')||'<div class="empty">Aucune imprimante appairée détectée.</div>'}</div>
  <div class="row"><button id="openBtSettings" class="ghost">Réglages Bluetooth Android</button><button id="refreshNativePrinters" class="ghost">Actualiser</button></div>
  <div class="printerTest"><b>Test prêt</b><span>Étiquette 1 : logo MISES! · Étiquette 2 : logo + trait + QR vers MISES!</span><button id="runPrinterTest" ${!saved?.deviceId?'disabled':''}>Imprimer les 2 étiquettes test</button></div></div>`
  d.showModal();$('#closeNativePrinter').onclick=()=>d.close();$('#openBtSettings').onclick=()=>window.MisesAndroidPrinter.openBluetoothSettings();$('#refreshNativePrinters').onclick=()=>{d.close();setTimeout(openNativePrinterDialog,250)}
  $$('[data-native-printer]',d).forEach(button=>button.onclick=async()=>{await db.put('settings',{id:'printer',name:button.dataset.nativeName,deviceId:button.dataset.nativePrinter,native:true,pairedAt:new Date().toISOString()});await updatePrinterStatus();d.close();setTimeout(openNativePrinterDialog,80);toast(`Imprimante choisie : ${button.dataset.nativeName}`)})
  $('#runPrinterTest').onclick=async()=>{const current=await db.get('settings','printer');if(!current?.deviceId){toast('Choisis l’imprimante');return}toast('Préparation des 2 étiquettes test…');const images=await makePrinterTestImages();await nativePrint(current.deviceId,images)}
}
async function printCaseNative(c,qr){
  const saved=await db.get('settings','printer');if(!saved?.deviceId||!hasNativePrinter()){await openNativePrinterDialog();return}
  const image=await makeThermalLabel({title:caseName(c),qrDataUrl:qr,subtitle:c.id});await nativePrint(saved.deviceId,[image])
}

function openPrint(c,qr){
  const d=$('#printDlg')
  d.innerHTML=`<div class="labelPreview"><strong>${esc(caseName(c))}</strong><img src="${qr}"><small>${esc(c.id)}</small></div>
  <div class="row"><button id="systemPrint">Impression système</button><button id="btPrint">${hasNativePrinter()?'Imprimer sur la mini-imprimante':'Bluetooth'}</button><button id="printerTestFromLabel" class="ghost">Test 2 étiquettes</button><button id="closePrint" class="ghost">Fermer</button></div>
  <p class="hint">${hasNativePrinter()?'Android : pilote direct WalkPrint / YHK expérimental, 384 px.':'PWA : impression système ; le pilote direct WalkPrint / YHK est disponible dans l’app Android.'}</p>`
  d.showModal()
  $('#closePrint').onclick=()=>d.close()
  $('#systemPrint').onclick=()=>window.print()
  $('#btPrint').onclick=()=>hasNativePrinter()?printCaseNative(c,qr):pairPrinter()
  $('#printerTestFromLabel').onclick=openNativePrinterDialog
}
async function openBatchPrint(){
  const d=$('#printDlg')
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Créer / imprimer des QR</b><small>Flash codes pour valises et caisses</small></div><button id="closeBatch" class="ghost">×</button></div><p class="hint">Coche les contenants, prépare les étiquettes QR, puis imprime. Chaque flash code rouvre la valise dans MISES!.</p><div class="checklist">${cases.map(c=>`<label class="check"><input type="checkbox" data-print-case value="${c.id}" checked><span>${esc(caseName(c))}</span></label>`).join('')||'<p>Aucun contenant.</p>'}</div><button id="makeBatch">Créer les QR / préparer l’impression</button><div id="batchLabels" class="batchLabels"></div></div>`
  d.showModal();$('#closeBatch').onclick=()=>d.close();$('#makeBatch').onclick=async()=>{const ids=$$('[data-print-case]:checked',d).map(x=>x.value),selected=cases.filter(c=>ids.includes(c.id));if(!selected.length){toast('Sélectionne au moins une valise');return}const labels=[];for(const c of selected){const url=location.href.split('?')[0]+'?case='+encodeURIComponent(c.id),qr=await QRCode.toDataURL(url,{width:420,margin:2,errorCorrectionLevel:'M'});labels.push(`<div class="labelPreview batchLabel"><strong>${esc(caseName(c))}</strong><img src="${qr}"><small>${esc(c.id)}</small></div>`)}$('#batchLabels').innerHTML=labels.join('')+`<div class="row"><button id="printBatchNow">Impression système</button></div>`;$('#printBatchNow').onclick=()=>window.print()}
}

async function updatePrinterStatus(){
  const saved=await db.get('settings','printer')
  const label=saved?.name?`Imprimante · ${saved.name}`:'Imprimante · À connecter'
  const button=$('#printerBtn');if(button){button.textContent=label;button.classList.toggle('connected',Boolean(saved))}
}
window.addEventListener('mises-native-printer-status',event=>{const message=String(event.detail||'');if(message)toast(message)})

async function pairPrinter(){
  if(hasNativePrinter())return openNativePrinterDialog()
  if(!navigator.bluetooth){toast('Bluetooth web indisponible ici · utilise l’impression système ou l’app Android');return}
  try{
    toast('Choisis ton imprimante Bluetooth')
    const device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:['battery_service']})
    let gattConnected=false
    try{if(device.gatt){await device.gatt.connect();gattConnected=device.gatt.connected}}catch{}
    await db.put('settings',{id:'printer',name:device.name||'Bluetooth',deviceId:device.id,pairedAt:new Date().toISOString(),gattConnected})
    await updatePrinterStatus()
    toast(gattConnected?'Bluetooth connecté · impression directe à tester':'Imprimante autorisée · protocole direct à identifier')
  }catch(e){if(e.name!=='NotFoundError') toast('Connexion Bluetooth impossible')}
}

function parseScannedTarget(text){
  const parsed=readEntityUrl(text)
  if(parsed&&(parsed.caseId||parsed.objectId||parsed.kitId||parsed.miseId)) return {...parsed,text}
  let caseId='',objectId='',kitId='',miseId=''
  if(caseBy(text))caseId=text
  else if(objectBy(text))objectId=text
  else if(kitBy(text))kitId=text
  else if(miseBy(text))miseId=text
  return {caseId,objectId,kitId,miseId,text}
}
async function handleScanTarget(target){
  if(scanPurpose!=='move'){
    if(target.caseId&&caseBy(target.caseId))return showCase(target.caseId)
    if(target.objectId&&objectBy(target.objectId))return openObject(objectBy(target.objectId))
    if(target.kitId&&kitBy(target.kitId))return showKit(target.kitId)
    if(target.miseId&&miseBy(target.miseId)){setTab('mises');return openMise(miseBy(target.miseId))}
    toast('QR non reconnu dans cette base');return
  }
  if(!moveScanState)moveScanState={step:'source',sourceCaseId:'',objectId:''}
  if(moveScanState.step==='source'){
    if(!target.caseId||!caseBy(target.caseId)){toast('Scanne d’abord la valise source');return setTimeout(()=>startScan(),350)}
    moveScanState.sourceCaseId=target.caseId;moveScanState.step='object';toast(`Source : ${caseName(caseBy(target.caseId))} · scanne l’objet`);return setTimeout(()=>startScan(),350)
  }
  if(moveScanState.step==='object'){
    if(!target.objectId||!objectBy(target.objectId)){toast('Scanne maintenant le QR de l’objet');return setTimeout(()=>startScan(),350)}
    const o=objectBy(target.objectId),actual=o.caseId||o.container_id||''
    if(actual&&actual!==moveScanState.sourceCaseId&&!confirm(`Cet objet est actuellement rangé dans « ${caseName(caseBy(actual))} », pas dans la valise source scannée. Continuer ?`)){moveScanState={step:'source',sourceCaseId:'',objectId:''};toast('Déplacement annulé');scanPurpose='browse';return}
    moveScanState.objectId=target.objectId;moveScanState.step='destination';toast(`Objet : ${o.name} · scanne la valise destination`);return setTimeout(()=>startScan(),350)
  }
  if(moveScanState.step==='destination'){
    if(!target.caseId||!caseBy(target.caseId)){toast('Scanne la valise destination');return setTimeout(()=>startScan(),350)}
    const o=objectBy(moveScanState.objectId),from=o.caseId||o.container_id||'',to=target.caseId
    o.locationHistory=[...(o.locationHistory||[]),{at:new Date().toISOString(),from,to,method:'scan'}];o.caseId=to;o.container_id=to;o.updatedAt=new Date().toISOString();await db.put('objects',o);scheduleDriveSync();await refresh();render();toast(`${o.name} → ${caseName(caseBy(to))}`);moveScanState=null;scanPurpose='browse'
  }
}
function startMoveScans(){
  if(!cases.length||!objects.length){toast('Il faut au moins un objet et une valise');return}
  scanPurpose='move';moveScanState={step:'source',sourceCaseId:'',objectId:''};toast('Déplacement · scanne la valise source');startScan()
}
async function startScan(){
  if(!navigator.mediaDevices){toast('Caméra indisponible');return}
  const d=$('#scanDlg');if(!d.open)d.showModal()
  const hint=$('#scanFeedback');if(hint)hint.textContent=scanPurpose==='move'?(moveScanState?.step==='source'?'1/3 · Scanne la valise source':moveScanState?.step==='object'?'2/3 · Scanne le QR de l’objet':'3/3 · Scanne la valise destination'):'Cadre un QR. La lecture est continue, sans bouton déclencheur.'
  scanner=new BrowserQRCodeReader();let handled=false
  try{
    await scanner.decodeFromVideoDevice(undefined,$('#scanVideo'),(result)=>{
      if(!result||handled)return
      handled=true
      const text=result.getText()
      if(hint)hint.textContent=`QR lu : ${text}`
      try{navigator.vibrate?.(40)}catch{}
      stopScan();void handleScanTarget(parseScannedTarget(text))
    })
  }catch{toast('Impossible d’ouvrir la caméra')}
}
async function captureScanFrame(){
  const video=$('#scanVideo')
  if(!video?.videoWidth){toast('La caméra n’a pas encore d’image');return}
  const canvas=document.createElement('canvas')
  canvas.width=video.videoWidth;canvas.height=video.videoHeight
  canvas.getContext('2d').drawImage(video,0,0)
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85))
  stopScan()
  if(blob) await runLocalPhoto(new File([blob],'camera.jpg',{type:'image/jpeg'}), null, 'group')
}
async function decodeQrElement(img){
  const reader=new BrowserQRCodeReader()
  const width=img.naturalWidth||img.width, height=img.naturalHeight||img.height
  const regions=[[0,0,width,height],[width*.12,height*.28,width*.76,height*.5],[width*.18,height*.36,width*.64,height*.42]]
  const canvas=document.createElement('canvas')
  let last
  for(const [x,y,w,h] of regions){
    canvas.width=Math.max(32,Math.round(w));canvas.height=Math.max(32,Math.round(h))
    const ctx=canvas.getContext('2d',{willReadFrequently:true})
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.imageSmoothingEnabled=false
    ctx.drawImage(img,x,y,w,h,0,0,canvas.width,canvas.height)
    try{return await reader.decodeFromCanvas(canvas)}catch(error){last=error}
  }
  throw last||new Error('QR illisible')
}
async function ingestQrImage(dataUrl){
  const img=await loadImage(dataUrl)
  const result=await decodeQrElement(img)
  const target=parseScannedTarget(result.getText())
  await handleScanTarget(target)
  return {text:result.getText(), target}
}
function stopScan(){
  try{scanner?.reset()}catch{}
  scanner=null
  const d=$('#scanDlg');if(d?.open)d.close()
}
$('#stopScan').onclick=()=>{stopScan();if(scanPurpose==='move'){scanPurpose='browse';moveScanState=null;toast('Déplacement annulé')}}
$('#scanObjects').onclick=()=>captureScanFrame()

function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!SR){toast('Dictée non disponible dans ce navigateur');return}
  const r=new SR();r.lang='fr-FR';r.interimResults=true;r.continuous=false
  $('#mic').classList.add('listening')
  r.onresult=e=>{
    let t='';for(const x of e.results)t+=x[0].transcript+' '
    $('#q').value=t.trim();setTab('search');renderSearch()
  }
  r.onend=()=>$('#mic').classList.remove('listening')
  r.start()
}
$('#mic').onclick=startVoice
applyInk(localStorage.getItem(LOCAL_KEYS.ink))
const savedInk = inkFromSettings([await db.get('settings', 'ink')].filter(Boolean))
if(savedInk){
  localStorage.setItem(LOCAL_KEYS.ink, savedInk)
  applyInk(savedInk)
}
async function rememberInk(hex){
  const ink = parseInk(hex) || DEFAULT_INK
  const custom = ink !== DEFAULT_INK
  if(custom) localStorage.setItem(LOCAL_KEYS.ink, ink)
  else localStorage.removeItem(LOCAL_KEYS.ink)
  applyInk(ink)
  if(custom) await db.put('settings', inkSetting(ink))
  else await db.delete('settings', 'ink')
  paintInkSwatches(ink)
}
function paintInkSwatches(current = parseInk(localStorage.getItem(LOCAL_KEYS.ink)) || DEFAULT_INK){
  const box = $('#inkSwatches')
  if(!box) return
  box.innerHTML = INK_PALETTE.map(item => `<button type="button" data-ink="${item.hex}" style="background:${item.hex};color:${contrastOn(item.hex)}" aria-label="${item.name}" aria-pressed="${item.hex === current ? 'true' : 'false'}"></button>`).join('')
  box.querySelectorAll('[data-ink]').forEach(button => { button.onclick = () => rememberInk(button.dataset.ink) })
  const custom = $('#inkCustom')
  if(custom) custom.value = current.toLowerCase()
}
function applyUiPreferences(){
  paintInkSwatches(parseInk(localStorage.getItem(LOCAL_KEYS.ink)) || DEFAULT_INK)
  const display=localStorage.getItem(LOCAL_KEYS.display)||'auto',theme=localStorage.getItem(LOCAL_KEYS.theme)||'system',interfaceMode=localStorage.getItem(INTERFACE_MODE_KEY)||'foley'
  document.documentElement.dataset.display=display
  document.documentElement.dataset.theme=theme
  document.documentElement.dataset.interface=interfaceMode
  const displaySelect=$('#displayMode'),themeSelect=$('#themeMode'),interfaceSelect=$('#interfaceMode')
  if(displaySelect)displaySelect.value=display
  if(themeSelect)themeSelect.value=theme
  if(interfaceSelect)interfaceSelect.value=interfaceMode
  const categoryBox=$('#customCategories');if(categoryBox){let custom=[];try{custom=JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY)||'[]')}catch{};categoryBox.value=(Array.isArray(custom)?custom:[]).join(', ')}
  const q=$('#q');if(q)q.placeholder=interfaceMode==='inventory'?'Objet, catégorie, contenant, mise, kit…':'Objet, son, ambiance, contenant, mise, kit…'
  const googleState=$('#preferencesGoogleState')
  if(googleState){
    if(androidGoogleSignInBlocked()){
      googleState.innerHTML='<b>Google Drive</b><span>Indisponible dans l’application Android</span>'
      $('#preferencesGoogle').textContent='Pourquoi la connexion est indisponible'
    }else{
      const account=$('#accountBtn')?.textContent||''
      const connected=/connecté|reconnecter/i.test(account)&&!/non connecté/i.test(account)
      googleState.innerHTML=`<b>Google Drive</b><span>${connected?esc(account):'Non connecté'}</span>`
      $('#preferencesGoogle').textContent=connected?'Reconnecter Google Drive':project.source==='art'?'Continuer avec Google depuis ART':'Raccorder Google Drive'
    }
  }
  db.get('settings','linked-folder').then(linked=>{
    const state=$('#folderLinkState');if(!state||!linked)return
    state.textContent='Sélectionnez à nouveau le dossier pour préparer un lot d’import local.'
  }).catch(()=>{})
}
applyUiPreferences()
$('#inkCustom').addEventListener('input', event => { void rememberInk(event.target.value) })
$('#inkDefault').onclick = () => { void rememberInk(DEFAULT_INK) }
$('#preferencesBtn').onclick=()=>{applyUiPreferences();$('#preferencesDlg').showModal()}
$('#interfaceMode').onchange=e=>{localStorage.setItem(INTERFACE_MODE_KEY,e.target.value);applyUiPreferences();if(e.target.value==='inventory'&&$('.tab.active')?.classList.contains('foleyOnly'))setTab('search');render()}
$('#customCategories').onchange=e=>{const values=unique(String(e.target.value||'').split(/[,\n;]/).map(x=>x.trim()).filter(Boolean));localStorage.setItem(CUSTOM_CATEGORIES_KEY,JSON.stringify(values));toast('Catégories enregistrées')}
$('#displayMode').onchange=e=>{localStorage.setItem(LOCAL_KEYS.display,e.target.value);applyUiPreferences()}
$('#themeMode').onchange=e=>{localStorage.setItem(LOCAL_KEYS.theme,e.target.value);applyUiPreferences()}
$('#closePreferences').onclick=()=>$('#preferencesDlg').close()
$('#preferencesGoogle').onclick=()=>connectGoogle()
$('#preferencesBackup').onclick=()=>$('#backupBtn').click()
$('#preferencesRestore').onclick=()=>$('#restoreInput').click()
$('#chooseFolder').onclick=()=>$('#folderDropInput').click()
const folderDropZone=$('#folderDropZone')
async function folderSelection(files){
  if(!files?.length)return
  $('#preferencesDlg').close()
  await openDataBruitage({db,files:[...files],changed:async()=>{await refresh();render()}})
}
$('#folderDropInput').onchange=e=>{folderSelection(e.target.files);e.target.value=''}
for(const name of ['dragenter','dragover'])folderDropZone.addEventListener(name,e=>{e.preventDefault();folderDropZone.classList.add('dragging')})
for(const name of ['dragleave','drop'])folderDropZone.addEventListener(name,e=>{e.preventDefault();folderDropZone.classList.remove('dragging')})
folderDropZone.addEventListener('drop',e=>folderSelection(e.dataTransfer.files))
$('#accountBtn').onclick=connectGoogle
$('#goalGoogle').onclick=connectGoogle
$('#printerBtn').onclick=pairPrinter
$('#goalPrinter').onclick=pairPrinter
$('#manualBtn').onclick=()=>$('#manualDlg').showModal()
$('#goalManual').onclick=()=>$('#manualDlg').showModal()
$('#closeManual').onclick=()=>$('#manualDlg').close()

let aboutReturnsToPreferences=false
function closeAbout(){
  const about=$('#aboutDlg')
  if(about?.open)about.close()
  if(aboutReturnsToPreferences){
    aboutReturnsToPreferences=false
    applyUiPreferences()
    const prefs=$('#preferencesDlg')
    if(prefs&&!prefs.open)prefs.showModal()
  }
}
function openAbout(){
  const prefs=$('#preferencesDlg')
  aboutReturnsToPreferences=Boolean(prefs?.open)
  if(aboutReturnsToPreferences)prefs.close()
  $('#aboutDlg').showModal()
}
$('#preferencesAbout').onclick=openAbout
$('#closeAbout').onclick=closeAbout
$('#aboutDlg').addEventListener('cancel',event=>{event.preventDefault();closeAbout()})

function isDialogBackdropClick(dialog,event){
  if(event.target!==dialog)return false
  const rect=dialog.getBoundingClientRect()
  return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom
}
function closeDialogFromBackdrop(dialog){
  if(dialog.id==='scanDlg'){
    $('#stopScan')?.click()
    return
  }
  if(dialog.id==='aboutDlg'){
    closeAbout()
    return
  }
  if(dialog.open)dialog.close()
}
$$('dialog').forEach(dialog=>{
  dialog.addEventListener('click',event=>{
    if(isDialogBackdropClick(dialog,event))closeDialogFromBackdrop(dialog)
  })
})
$('#scanDlg').addEventListener('cancel',event=>{event.preventDefault();$('#stopScan')?.click()})

document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[data-external]')
  if(!link||!window.MisesAndroid)return
  event.preventDefault()
  window.location.assign(link.href)
})
$('#goalBackup').onclick=()=>$('#backupBtn').click()
$('#goalRestore').onclick=()=>$('#restoreInput').click()
$('#goalGroupPhoto').onclick=()=>$('#groupPhotoInput').click()
$('#goalHands').onclick=()=>{$('#handsPhotoInput').click()}
$('#goalUniverse').onclick=()=>$('#universePhotoInput').click()
$('#goalExercise').onclick=()=>setTab('exercises')
$('#goalRandomUniverse').onclick=()=>openRandomPublicUniverse()
$('#goalAddObjectSimple').onclick=()=>openObject()
$('#goalAddCaseSimple').onclick=()=>$('#addCase').click()
$('#goalQrSimple').onclick=()=>{setTab('cases');toast('Ouvre un contenant pour créer / imprimer ses étiquettes QR')}
$('#inventoryInput').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)runLocalPhoto(file,null,'inventory')}
$('#handsPhotoInput').onchange=e=>{const file=e.target.files?.[0];e.target.value='';pendingExerciseMinutes=pendingExerciseMinutes||1;if(file)runLocalPhoto(file,null,'hands')}
$('#universePhotoInput').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)runLocalPhoto(file,null,'universe')}
$('#undoBtn').onclick=async()=>{const last=undoStack.pop();if(!last){$('#undoBtn').hidden=true;return}await db.delete(last.store,last.id);await refresh();render();$('#undoBtn').hidden=!undoStack.length;toast('Dernière création annulée')}
async function runVibe(prompt){
  const value=(prompt??$('#vibePrompt').value).trim()
  if(!value){toast('Décris un univers');return}
  $('#vibePrompt').value=value
  const result=proposeVibe(value,objects,cases,learnings)
  $('#vibeOut').innerHTML=vibeBlock(result,esc)
  $$('[data-vibe-useful]',$('#vibeOut')).forEach(button=>button.onclick=async()=>{
    await db.put('learnings',newLearning({kind:'vibe-feedback',objectId:button.dataset.object,universeId:button.dataset.universe,useful:button.dataset.vibeUseful==='1'}))
    await refresh();toast(button.dataset.vibeUseful==='1'?'Noté comme utile':'Noté comme pas pertinent');runVibe(value)
  })
}
function runExercise(){
  const chosen=[...objects].sort((a,b)=>(Number(b.favorite)-Number(a.favorite))||a.name.localeCompare(b.name,'fr')).slice(0,6)
  const pack=generateExercises({objects:chosen.map(o=>({name:o.name})),durationMin:Number($('#exDuration').value),participants:Number($('#exPeople').value)||1,level:$('#exLevel').value,mode:$('#exMode').value||undefined,universe:$('#exUniverse').value.trim(),count:4})
  $('#exerciseOut').innerHTML=(chosen.length?`<p class="hint">À partir de tes fiches : ${esc(chosen.map(o=>o.name).join(', '))}.</p>`:'')+exerciseBlock(pack,esc)
}
$('#runVibe').onclick=()=>runVibe()
$$('[data-vibe-preset]').forEach(button=>button.onclick=()=>{setTab('vibe');runVibe(button.dataset.vibePreset)})
$('#runExercise').onclick=()=>{setTab('exercises');runExercise()}
$('#goalChallenge').onclick=openChallenge
$('#goalPlay').onclick=()=>openPlayHub()
$('#goalWorkshop').onclick=()=>openWorkshopFlow({},'tout l’inventaire')
$('#goalMove').onclick=startMoveScans
$('#goalShare').onclick=openShareDialog
$('#goalBatchPrint').onclick=openBatchPrint
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
const isStandalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true
if(isIOS&&!isStandalone){$('#goalIosInstall').hidden=false;$('#goalIosInstall').onclick=()=>{$('#manualDlg').showModal();setTimeout(()=>$('#manualIos')?.scrollIntoView({block:'center',behavior:'smooth'}),80)}}
if(isIOS&&isStandalone){setTimeout(async()=>{const account=await db.get('settings','google-account');if(!account&&!objects.length&&!cases.length)toast('MISES! installée · reconnecte Google ou importe ta sauvegarde si tu en avais une dans Safari')},700)}
updatePrinterStatus();updateAccountStatus()

$$('[data-action]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.action
  if(a==='photo')pickPhoto('photoInput')
  if(a==='scan')startScan()
  if(a==='inventory')$('#inventoryInput').click()
  if(a==='last-mise'){
    const m=miseBy(activeMise)||mises.slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0]
    if(!m){toast('Aucune mise pour l’instant');return}
    activeMise=m.id;setTab('mises');openMise(m)
  }
})
$$('[data-preset]').forEach(b=>b.onclick=()=>{
  $('#q').value=b.dataset.preset;renderCreator()
})

function renderCreator(){
  const q=$('#q').value.trim()||'mer'
  $('#creatorResults').innerHTML='<div class="panel"><b>Ton parc</b></div><div id="creatorOwned"></div><div class="panel"><b>Autres pistes</b><p class="hint">Suggestions, jamais confondues avec ton inventaire.</p></div><div id="creatorIdeas"></div>'
  renderSearch('#creatorOwned')
  const ideas=searchExternal(q)
  $('#creatorIdeas').innerHTML=ideas.length?ideas.map(i=>`<article class="result idea"><div class="thumb">·</div><div><h3>${esc(i.name)}</h3><p>${(i.sounds||[]).map(chip).join(' ')}</p><small>Source externe · ${esc(i.source||'référence')}</small></div></article>`).join(''):'<div class="empty">Pas encore d’autre piste indexée pour cette recherche. Les élargissements de recherche ne sont pas des documents.</div>'
}

function render(){
  renderSearch()
  renderPublicSections()
  $('#objectCards').innerHTML=objects.length?objects.slice().sort((a,b)=>(Number(b.favorite)-Number(a.favorite))||a.name.localeCompare(b.name,'fr')).map(o=>`<button class="card objectCard" data-object="${o.id}">
    <b>${o.favorite?'★ ':''}${esc(o.name)}</b><span>${esc(soundSummary(o)||'Son à préciser')}</span><small>${esc(caseName(caseBy(o.caseId||o.container_id)))}${o.audioMemo?' · mémo sonore':''} · ${esc(provenanceLabel(o.provenance||'user-document'))}</small></button>`).join(''):'<div class="empty"><b>Aucun objet pour l’instant.</b><span>Importe tes Data Bruitage ou ajoute une fiche. Rien n’est inventé à ta place.</span></div>'
  $$('[data-object]').forEach(b=>b.onclick=()=>openObject(objects.find(o=>o.id===b.dataset.object)))

  $('#caseCards').innerHTML=cases.length?cases.map(c=>`<button class="card caseCard" data-case="${c.id}"><b>${esc(caseName(c))}</b><span>${objects.filter(o=>(o.caseId||o.container_id)===c.id).length} objets</span><small>QR prêt · ouvrir pour créer / imprimer</small></button>`).join(''):'<div class="empty"><b>Aucun contenant.</b><span>Crée une valise ou une caisse, puis crée / imprime son QR code.</span></div>'
  $$('[data-case]').forEach(b=>b.onclick=()=>showCase(b.dataset.case))

  $('#kitCards').innerHTML=kits.length?kits.map(k=>`<article class="card"><b>${esc(k.name)}</b><span>${(k.objectIds||[]).length} objets · ${esc((k.contexts||[]).join(' · ')||'indépendant')}</span><small>${esc(k.source||'manuel')} · un kit n’est qu’une vue</small>
    <div class="row"><button data-prep="${k.id}">Préparer demain</button><button data-kitqr="${k.id}" class="ghost">QR</button><button data-editkit="${k.id}" class="ghost">Modifier</button></div></article>`).join(''):'<div class="empty"><b>Aucun kit.</b><span>Un kit est une vue sur le parc, pas la base Data Bruitage.</span></div>'
  $$('[data-prep]').forEach(b=>b.onclick=()=>createMiseFromKit(kitBy(b.dataset.prep)))
  $$('[data-kitqr]').forEach(b=>b.onclick=()=>showKit(b.dataset.kitqr))
  $$('[data-editkit]').forEach(b=>b.onclick=()=>openKit(kitBy(b.dataset.editkit)))

  $('#miseCards').innerHTML=mises.length?mises.map(m=>`<article class="card ${activeMise===m.id?'activeMise':''}">
    <div class="miseTitle"><b>${esc(m.name)}</b><button class="link" data-active="${m.id}">${activeMise===m.id?'Active':'Activer'}</button></div>
    <span>${(m.objectIds||[]).length} objets · ${(m.checked||[]).length} contrôlés</span>
    <div class="checklist">${(m.objectIds||[]).map(id=>objects.find(o=>o.id===id)).filter(Boolean).map(o=>`<label class="check"><input type="checkbox" data-mise="${m.id}" value="${o.id}" ${(m.checked||[]).includes(o.id)?'checked':''}><span>${esc(o.name)} <small>· ${esc(caseName(caseBy(o.caseId||o.container_id)))}</small></span></label>`).join('')}</div>
    <div class="row"><button data-control="${m.id}">📷 Contrôle photo · bêta</button><button data-editmise="${m.id}" class="ghost">Modifier</button></div>
  </article>`).join(''):'<div class="empty"><b>Aucune mise pour le moment.</b><span>Crée une mise ou ouvre un kit pour préparer le spectacle.</span></div>'
  $$('[data-active]').forEach(b=>b.onclick=()=>{activeMise=b.dataset.active;render()})
  $$('#miseCards .check input').forEach(x=>x.onchange=()=>toggleCheck(miseBy(x.dataset.mise),x.value,x.checked))
  $$('[data-editmise]').forEach(b=>b.onclick=()=>openMise(miseBy(b.dataset.editmise)))
  $$('[data-control]').forEach(b=>b.onclick=()=>{activeMise=b.dataset.control;photoTargetMiseId=b.dataset.control;$('#photoInput').click()})
}
render()

$('#backupBtn').onclick=async()=>{
  const payload=await privateStatePayload()
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download='MISES-backup.json';document.body.append(a);a.click();a.remove()
  setTimeout(()=>URL.revokeObjectURL(url),2000)
}

$('#restoreInput').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return
  try{const payload=JSON.parse(await file.text());if(!confirm('Importer cette sauvegarde MISES! et remplacer les données locales de cet appareil ?'))return;await applyPrivateState(payload);scheduleDriveSync();toast('Sauvegarde importée')}catch(error){toast(error instanceof Error?error.message:'Import impossible')}finally{event.target.value=''}
}

await settleArtProject()
if(params.get('shareFile'))setTimeout(()=>openSharedPackage(params.get('shareFile')),300)
else if(params.get('case'))setTimeout(()=>showCase(params.get('case')),250)
else if(params.get('kit'))setTimeout(()=>showKit(params.get('kit')),250)
else if(params.get('mise'))setTimeout(()=>{const found=miseBy(params.get('mise'));if(found)openMise(found)},250)
else if(params.get('object'))setTimeout(()=>{const o=objectBy(params.get('object'));if(o)openObject(o)},250)
window.__mise={version:APP_VERSION,ingestQrImage,parseScannedTarget}
