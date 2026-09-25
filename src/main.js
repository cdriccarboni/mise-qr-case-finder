
import './style.css'
import Fuse from 'fuse.js'
import QRCode from 'qrcode'
import { BrowserQRCodeReader } from '@zxing/browser'
import { openDB } from 'idb'
import { registerSW } from 'virtual:pwa-register'
import { readProjectContext, requestPhotoAnalysis, makeControlSummary, makeProjectSummary } from './project-control.js'
import { artGoogleSession, requestGoogleSession, connectedGoogleProfile, loadPrivateState, savePrivateState, createSharePackage, loadSharePackage } from './google-sync.js'

registerSW({ immediate:true })

const $=(s,r=document)=>r.querySelector(s)
const $$=(s,r=document)=>[...r.querySelectorAll(s)]
const uid=p=>`${p}-${crypto.randomUUID()}`
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/[-_/]+/g,' ').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
const unique=a=>[...new Set((a||[]).filter(Boolean))]
const safeExternal=x=>!/(gun|weapon|arme|fusil|pisto|coup de feu|explosi|knife)/i.test(JSON.stringify(x))
const params=new URLSearchParams(location.search)
const project=readProjectContext(location.search,location.href)

const db=await openDB('mise-db',3,{upgrade(d){
  for(const s of ['objects','cases','kits','mises','settings']) {
    if(!d.objectStoreNames.contains(s)) d.createObjectStore(s,{keyPath:'id'})
  }
}})

const seed=await fetch('./data.json').then(r=>r.json()).catch(()=>({objects:[],containers:[],object_sound_links:[],web_reference_ideas:[],intent_packs:[]}))

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

let objects=[],cases=[],kits=[],mises=[],activeMise=null, scanner=null, photoTargetMiseId=null
let scanPurpose='browse',moveScanState=null
let projectSyncFailed=false
async function refresh(){
  objects=await db.getAll('objects')
  cases=await db.getAll('cases')
  kits=await db.getAll('kits')
  mises=await db.getAll('mises')
  const eligible=project.projectId?mises.filter(m=>m.projectId===project.projectId):mises
  if(!eligible.some(m=>m.id===activeMise)) activeMise=eligible.slice().sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''))[0]?.id||null
}
await refresh()

let driveSyncTimer=0,driveSyncBusy=false
async function privateStatePayload(){
  return {version:1,exportedAt:new Date().toISOString(),objects:await db.getAll('objects'),cases:await db.getAll('cases'),kits:await db.getAll('kits'),mises:await db.getAll('mises')}
}
async function applyPrivateState(payload){
  if(!payload||typeof payload!=='object')throw new Error('Sauvegarde MISE ! invalide')
  for(const store of ['objects','cases','kits','mises']){
    await db.clear(store)
    for(const item of Array.isArray(payload[store])?payload[store]:[]) if(item?.id) await db.put(store,item)
  }
  activeMise=null;await refresh();render()
}
async function updateAccountStatus(){
  const saved=await db.get('settings','google-account'),session=artGoogleSession(),button=$('#accountBtn')
  if(!button)return
  button.textContent=saved?.email?(session?`Google · ${saved.email}`:'Google · Reconnecter'):'Google · À connecter'
  button.classList.toggle('connected',Boolean(saved&&session))
}
async function connectGoogle(){
  try{
    await requestGoogleSession()
    const profile=await connectedGoogleProfile(),email=String(profile?.email||'').trim()
    if(!email)throw new Error('Compte Google non identifiable')
    if(!confirm(`Utiliser ce compte Google pour la base privée MISE ! ?\n\n${email}\n\nRien ne sera partagé publiquement.`))return
    await db.put('settings',{id:'google-account',email,name:profile?.name||'',confirmedAt:new Date().toISOString()})
    await updateAccountStatus();toast('Compte validé · vérification du Drive privé…')
    const remote=await loadPrivateState(),localCount=objects.length+cases.length+kits.length+mises.length
    if(remote.payload){
      if(localCount===0||confirm('Une sauvegarde MISE ! privée existe sur Drive. La charger sur cet appareil ?')){await applyPrivateState(remote.payload);toast('Base privée chargée depuis Drive')}
    }else{
      await savePrivateState(await privateStatePayload());toast('Base privée créée dans Drive / _ART / MISE !')
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
    localStorage.setItem(`art-mise-project-v1:${m.projectId}`,JSON.stringify(summary))
    projectSyncFailed=false
    window.dispatchEvent(new CustomEvent('art-mise-project-change',{detail:summary}))
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
  el.innerHTML=`<div><span class="eyebrow">${project.projectId?'Projet ART':'Espace de préparation'}</span><h1>${esc(project.projectId?(project.projectName||project.projectId):'Préparer le terrain')}</h1><p>${project.projectId?`${esc(project.projectType||'Projet')} · Réf. ${esc(project.projectId)}`:'Inventaire, kits et contrôles de mise.'}</p></div>
    ${project.returnUrl?`<a class="returnLink" href="${esc(project.returnUrl)}">Retour au projet</a>`:''}
    <p class="projectNote">Data Bruitage reste la source globale. ${project.projectId?'Les mises sont liées à ce projet, quelle que soit sa date de création.':'Les mises peuvent être liées depuis un projet ART.'}</p>
    ${projectSyncFailed?'<p class="syncWarning" role="alert">Mise enregistrée sur cet appareil. Transmission locale à ART impossible : autorisez le stockage local puis rechargez cette page.</p>':''}`
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
const external=dataBruitageCorpus
const intents=seed.intent_packs||[]
const corpusSummary=[
  `${(seed.sources||[]).length} sources structurées`,
  `${(seed.resource_index||[]).length} documents indexés`,
  `${(seed.objects||[]).length} objets`,
  `${(seed.sounds||[]).length} sons`
].join(' · ')

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
    searchText:[o.name,o.detectedName,...(o.sounds||[]),...(o.tags||[]),...(o.contexts||[]),o.family,caseName(caseBy(o.caseId||o.container_id))].join(' ')
  }))
  const fuse=new Fuse(enriched,{
    keys:[
      {name:'name',weight:.35},{name:'sounds',weight:.28},{name:'tags',weight:.12},
      {name:'searchText',weight:.18},{name:'caseLabel',weight:.07}
    ],
    threshold:.44,ignoreLocation:true,includeScore:true
  })
  return fuse.search(expandQuery(q)).map(x=>({...x.item,_score:x.score})).sort((a,b)=>(Number(b.favorite)-Number(a.favorite))||(a._score-b._score)).slice(0,20)
}
function searchExternal(q){
  if(!q.trim()) return []
  return new Fuse(external,{keys:['name','sounds','aliases','summary','source','kind'],threshold:.44,ignoreLocation:true})
    .search(expandQuery(q)).slice(0,8).map(x=>x.item)
}
function chip(s){return `<span class="chip">${esc(s)}</span>`}
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
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Enregistrement audio non disponible ici');return}
  let stream
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[],rec=new MediaRecorder(stream)
    button.disabled=true;button.textContent='● Enregistrement… toucher pour arrêter'
    const done=new Promise(resolve=>{rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=resolve})
    rec.start();let stopped=false;const stop=()=>{if(stopped)return;stopped=true;rec.stop()};button.onclick=stop;const timer=setTimeout(stop,10000)
    await done;clearTimeout(timer);stream.getTracks().forEach(t=>t.stop())
    const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});o.audioMemo=await blobToDataUrl(blob);o.audioMemoAt=new Date().toISOString()
    button.disabled=false;button.textContent='Mémo sonore enregistré';toast('Mémo sonore ajouté · pense à enregistrer la fiche')
  }catch{stream?.getTracks().forEach(t=>t.stop());button.disabled=false;button.textContent='Enregistrer un mémo sonore';toast('Microphone indisponible')}
}
async function showObjectQr(o){
  const url=location.href.split('?')[0]+'?object='+encodeURIComponent(o.id),qr=await QRCode.toDataURL(url,{width:520,margin:2,errorCorrectionLevel:'M'}),d=$('#printDlg')
  d.innerHTML=`<div class="labelPreview"><strong>${esc(o.name)}</strong><img src="${qr}"><small>${esc(caseName(caseBy(o.caseId||o.container_id)))}</small></div><div class="row"><button id="systemPrint">Impression système</button><button id="closePrint" class="ghost">Fermer</button></div>`
  d.showModal();$('#closePrint').onclick=()=>d.close();$('#systemPrint').onclick=()=>window.print()
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
function openChallenge(){
  const pools=['mer','forêt','pluie','orage','pas','maison','vent','mécanique','nuit','feu'],pick=pools[Math.floor(Math.random()*pools.length)],count=Math.min(3,Math.max(1,objects.length)),d=$('#modal')
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Défi bruitage</b><small>Mallette pédagogique</small></div><button id="closeChallenge" class="ghost">×</button></div><div class="challenge"><strong>Crée « ${esc(pick)} » avec ${count} objet${count>1?'s':''} maximum.</strong><p>Essaie plusieurs gestes, écoute, puis compare les solutions.</p></div><div class="row"><button id="tryChallenge">Voir mes pistes</button><button id="newChallenge" class="ghost">Autre défi</button></div></div>`
  d.showModal();$('#closeChallenge').onclick=()=>d.close();$('#newChallenge').onclick=()=>{d.close();openChallenge()};$('#tryChallenge').onclick=()=>{d.close();$('#q').value=pick;setTab('creator');renderCreator()}
}
function sharePayload({miseIds=[],kitIds=[],caseIds=[],objectIds=[],includeMedia=false}={}){
  const selectedMises=mises.filter(x=>miseIds.includes(x.id)),selectedKits=kits.filter(x=>kitIds.includes(x.id)),selectedCases=cases.filter(x=>caseIds.includes(x.id))
  const ids=new Set(objectIds)
  selectedMises.forEach(x=>(x.objectIds||[]).forEach(id=>ids.add(id)));selectedKits.forEach(x=>(x.objectIds||[]).forEach(id=>ids.add(id)));selectedCases.forEach(c=>objects.filter(o=>(o.caseId||o.container_id)===c.id).forEach(o=>ids.add(o.id)))
  const sharedObjects=objects.filter(o=>ids.has(o.id)).map(o=>{const x={...o};if(!includeMedia){delete x.photo;delete x.audioMemo;delete x.controlPhoto}return x})
  const referencedCases=cases.filter(c=>caseIds.includes(c.id)||sharedObjects.some(o=>(o.caseId||o.container_id)===c.id))
  return {version:1,kind:'mise-share',createdAt:new Date().toISOString(),project:project.projectId?{id:project.projectId,name:project.projectName,type:project.projectType}:null,includeMedia,objects:sharedObjects,cases:referencedCases,kits:selectedKits,mises:selectedMises}
}
function openShareDialog(){
  const d=$('#modal'),members=companyMemberEmails()
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Partager par QR</b><small>Seulement ce que tu sélectionnes</small></div><button id="closeShare" class="ghost">×</button></div>
  <p class="hint">Le paquet est créé séparément dans Drive. Ta base complète n’est jamais partagée.</p>
  <div class="shareColumns"><div><b>Mises</b>${mises.map(x=>`<label class="check"><input type="checkbox" data-share-mise value="${x.id}"><span>${esc(x.name)}</span></label>`).join('')||'<small>Aucune mise</small>'}</div><div><b>Kits</b>${kits.map(x=>`<label class="check"><input type="checkbox" data-share-kit value="${x.id}"><span>${esc(x.name)}</span></label>`).join('')||'<small>Aucun kit</small>'}</div><div><b>Valises</b>${cases.map(x=>`<label class="check"><input type="checkbox" data-share-case value="${x.id}"><span>${esc(caseName(x))}</span></label>`).join('')||'<small>Aucune valise</small>'}</div></div>
  <details><summary>Sélection d’objets</summary><div class="checklist">${objects.map(x=>`<label class="check"><input type="checkbox" data-share-object value="${x.id}"><span>${esc(x.name)}</span></label>`).join('')}</div></details>
  <label class="check"><input type="checkbox" id="shareMedia"><span>Inclure photos et mémos sonores</span></label>
  <label>Destinataires Google<textarea id="shareRecipients" rows="3" placeholder="une.adresse@gmail.com, autre@gmail.com">${esc(members.join(', '))}</textarea></label>
  <button id="createShare">Créer le partage privé + QR</button><div id="shareResult"></div></div>`
  d.showModal();$('#closeShare').onclick=()=>d.close();$('#createShare').onclick=async()=>{const btn=$('#createShare');btn.disabled=true;try{const recipients=$('#shareRecipients').value.split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);if(!recipients.length)throw new Error('Ajoute au moins une adresse destinataire');const payload=sharePayload({miseIds:$$('[data-share-mise]:checked',d).map(x=>x.value),kitIds:$$('[data-share-kit]:checked',d).map(x=>x.value),caseIds:$$('[data-share-case]:checked',d).map(x=>x.value),objectIds:$$('[data-share-object]:checked',d).map(x=>x.value),includeMedia:$('#shareMedia').checked});if(!payload.objects.length&&!payload.mises.length&&!payload.kits.length&&!payload.cases.length)throw new Error('Sélectionne au moins un élément');const out=await createSharePackage(payload,recipients);const url=`https://art.acousmatic-theatre.fr/mise-app/?shareFile=${encodeURIComponent(out.file.id)}`,qr=await QRCode.toDataURL(url,{width:420,margin:2,errorCorrectionLevel:'M'});$('#shareResult').innerHTML=`<div class="shareDone"><img class="qr" src="${qr}"><b>${out.recipients.length} destinataire${out.recipients.length>1?'s':''}</b><small>Le QR ouvre uniquement ce paquet MISE !.</small><button id="shareNative">Partager le lien</button></div>`;$('#shareNative').onclick=async()=>{try{if(navigator.share)await navigator.share({title:'MISE !',text:'Partage MISE !',url});else{await navigator.clipboard.writeText(url);toast('Lien copié')}}catch{}};toast('Partage créé')}catch(error){toast(error instanceof Error?error.message:'Partage impossible')}finally{btn.disabled=false}}
}
async function openSharedPackage(fileId){
  const d=$('#modal')
  try{const pack=await loadSharePackage(fileId);d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Partage MISE !</b><small>${esc(pack.project?.name||'Sélection partagée')}</small></div><button id="closeShared" class="ghost">×</button></div>${(pack.mises||[]).map(m=>`<article class="card"><b>${esc(m.name)}</b><span>${(m.objectIds||[]).length} objets</span></article>`).join('')}${(pack.objects||[]).map(o=>`<article class="result"><div class="thumb">${o.photo?`<img src="${o.photo}">`:'◌'}</div><div><h3>${esc(o.name)}</h3><p>${(o.sounds||[]).slice(0,5).map(chip).join(' ')}</p><small>${esc(caseName((pack.cases||[]).find(c=>c.id===(o.caseId||o.container_id))))}</small>${o.audioMemo?`<audio controls src="${o.audioMemo}"></audio>`:''}</div></article>`).join('')}</div>`;d.showModal();$('#closeShared').onclick=()=>d.close()}catch(error){toast(error instanceof Error?error.message:'Partage inaccessible')}
}

$('#app').innerHTML=`
<header>
  <div class="brand">
    <div class="wordmark">M<span class="logo-i"><b></b><i></i></span>SE <span class="bang"><b></b><i></i></span></div>
    <div class="sub">QR CASE FINDER</div>
    <div class="tag">Cherche ta mise</div>
    <div class="corpusMeta"><b>Data Bruitage</b><span>${esc(corpusSummary)}</span></div>
  </div>
  <div class="headerTools">
    <span id="networkStatus" class="status" role="status"></span>
    <button id="accountBtn" class="headerChip" type="button">Google · Non connecté</button>
    <button id="printerBtn" class="headerChip" type="button">Imprimante · À connecter</button>
    <button id="manualBtn" class="headerIcon" type="button" aria-label="Mini-manuel">?</button>
    <button id="backupBtn" class="headerIcon" type="button" aria-label="Sauvegarder">⇩</button>
  </div>
</header>
<main>
<section id="projectContext" class="projectContext" aria-label="Contexte du projet"></section>
<section class="hero">
  <label class="searchLabel" for="q">Recherche dans Data Bruitage</label>
  <div class="searchbox"><input id="q" autocomplete="off" placeholder="Objet, son, ambiance ou contenant"><button id="mic" title="Dicter une recherche" aria-label="Dicter une recherche">Dicter</button></div>
  <div class="quick">
    <button data-action="search">Rechercher</button>
    <button data-action="speak">Dictée vocale</button>
    <button data-action="photo">Ajouter une photo</button>
    <button data-action="scan">Scanner un QR</button>
  </div>
</section>
<div class="goalNav" aria-label="Navigation MISE">
 <details open><summary>Trouver & créer</summary><div><button data-tab="search" class="active">Recherche</button><button data-tab="creator">Créateur d’ambiance</button><button id="goalGroupPhoto" type="button">Photo de groupe</button><button id="goalChallenge" type="button">Défi bruitage</button></div></details>
 <details><summary>Ranger & préparer</summary><div><button data-tab="inventory">Objets & photos</button><button data-tab="cases">Valises & QR</button><button data-tab="kits">Kits</button><button data-tab="mises">Mises & contrôles</button><button id="goalMove" type="button">Déplacer par scans</button></div></details>
 <details><summary>Partager & outils</summary><div><button id="goalShare" type="button">Partager par QR</button><button id="goalGoogle" type="button">Connexion Google</button><button id="goalPrinter" type="button">Imprimante</button><button id="goalBatchPrint" type="button">Imprimer série QR</button><button id="goalManual" type="button">Mini-manuel</button><button id="goalBackup" type="button">Sauvegarde</button><button id="goalRestore" type="button">Importer sauvegarde</button><button id="goalIosInstall" type="button" hidden>Installer sur iPhone</button></div></details>
</div>
<section id="search" class="tab active"><div id="searchResults"></div></section>
<section id="inventory" class="tab"><div class="sectionhead"><h2>Objets</h2><button id="addObject">+ Objet</button></div><div id="objectCards" class="cards"></div></section>
<section id="cases" class="tab"><div class="sectionhead"><h2>Valises & caisses</h2><button id="addCase">+ Contenant</button></div><p class="hint">Ex. « Musique & percussions », « Vie quotidienne · 1/3 »…</p><div id="caseCards" class="cards"></div></section>
<section id="kits" class="tab"><div class="sectionhead"><h2>Kits</h2><button id="addKit">+ Kit</button></div><p class="hint">Un kit est un sous-ensemble de préparation issu de Data Bruitage : spectacle, atelier, tournée ou besoin ponctuel. Data Bruitage reste le corpus global.</p><div id="kitCards" class="cards"></div></section>
<section id="mises" class="tab"><div class="sectionhead"><h2>Mises & contrôles</h2><button id="addMise">+ Mise</button></div><div id="miseCards" class="cards"></div></section>
<section id="creator" class="tab">
  <div class="panel"><h2>Créateur de bruitage</h2><p>Décrivez une ambiance ou un son pour explorer Data Bruitage, votre parc et les références.</p>
  <div class="row"><button data-preset="mer" class="ghost">Mer</button><button data-preset="forêt" class="ghost">Forêt</button><button data-preset="feu" class="ghost">Feu</button><button data-preset="orage" class="ghost">Orage</button></div></div>
  <div id="creatorResults"></div>
</section>
</main>

<input id="photoInput" type="file" accept="image/*" capture="environment" hidden>
<input id="galleryInput" type="file" accept="image/*" hidden>
<input id="groupPhotoInput" type="file" accept="image/*" capture="environment" hidden>
<input id="restoreInput" type="file" accept=".json" hidden>
<dialog id="modal"></dialog>
<dialog id="scanDlg"><div class="dialoghead"><strong>Scanner un QR</strong><button id="stopScan" class="ghost">Fermer</button></div><video id="scanVideo" playsinline></video><p class="hint">Cadre le QR d'une valise ou d'une caisse.</p></dialog>
<dialog id="printDlg"></dialog>
<dialog id="manualDlg"><div class="manual"><div class="dialoghead"><div><b>MISE ! · Mini-manuel</b><small>QR Case Finder · prise en main rapide</small></div><button id="closeManual" class="ghost" type="button">×</button></div>
<div class="manualSteps">
<article><b>1 · Chercher une ambiance</b><span>Écris ou dicte « mer », « forêt », « vieille maison »… MISE ! remonte vers tes sons, objets, photos et valises.</span></article>
<article><b>2 · Ajouter un objet</b><span>Photographie-le ou importe une photo, donne-lui ton nom personnel, ses sons et son contenant.</span></article>
<article><b>3 · Ranger</b><span>Crée une valise ou une caisse, nomme-la clairement puis imprime son QR.</span></article>
<article><b>4 · Préparer</b><span>Crée un kit ou une mise, éventuellement rattachée à un spectacle/EAC ART, puis coche ce qui est prêt.</span></article>
<article><b>5 · Contrôler</b><span>Scanne les QR ou utilise le contrôle photo avant départ / avant jeu. Toute proposition photo reste à valider humainement.</span></article>
<article><b>6 · Imprimer</b><span>Ouvre une valise → Étiquette / imprimer. L’impression système fonctionne partout ; Bluetooth direct dépend du protocole de l’imprimante.</span></article>
<article><b>7 · Travailler plus vite</b><span>Favoris, alternatives, photo de groupe, mémo sonore, déplacement par scans et impression en série sont dans les trois menus par objectif.</span></article>
<article><b>8 · Partager</b><span>« Partager par QR » crée un paquet séparé sur Drive avec seulement ce que tu sélectionnes. Photos et mémos sonores sont optionnels.</span></article>
<article id="manualIos"><b>9 · iPhone / iPad</b><span>Dans Safari : bouton Partager → « Sur l’écran d’accueil » → garder « Ouvrir comme app Web » activé. Si ta base était déjà dans Safari, reconnecte Google ou importe une sauvegarde dans l’app installée.</span></article><article><b>10 · Confidentialité</b><span>Ta base personnelle n’est jamais incluse dans l’application publique. Les données de projet restent privées tant que tu ne les partages pas explicitement.</span></article>
</div><p class="manualNote">Le bouton ⇩ crée une sauvegarde locale de ta base.</p><p class="manualJoke">Toi aussi, tu as acheté une mini-imprimante thermique avec des oreilles de chat pour ta fille… puis tu t’es rendu compte que ce serait incroyablement pratique au boulot ? Voilà. MISE ! est née à peu près comme ça.</p></div></dialog>
<div id="toast" role="status"></div>`

renderProjectContext()
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
$$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab))

function renderSearch(target='#searchResults'){
  const q=$('#q').value.trim(), own=searchOwned(q), ideas=searchExternal(q)
  if(!q){
    $(target).innerHTML=`<div class="empty"><b>Écris ce que tu cherches.</b><span>Objet, son, ambiance, marque ou valise.</span><small>Ex. « atelier mer », « bouteille frangée », « forêt ».</small></div>`
    return
  }
  let h=`<div class="resultHead"><b>${own.length} résultat${own.length>1?'s':''} dans ton parc</b><span>Les idées externes restent séparées.</span></div>`
  h+=own.map(o=>`<article class="result">
    <div class="thumb">${o.photo?`<img src="${o.photo}">`:'◌'}</div>
    <div><h3>${esc(o.name)}</h3><p>${(o.sounds||[]).slice(0,5).map(chip).join(' ')||'<span class="muted">Son à préciser</span>'}</p>
    <small>${esc(caseName(caseBy(o.caseId||o.container_id)))} · ${esc(o.family||'À classer')}</small></div>
    <div class="resultActions"><button data-fav="${o.id}" class="miniAction" title="Favori">${o.favorite?'★':'☆'}</button><button data-alt="${o.id}" class="miniAction" title="Alternatives">≈</button><button data-add="${o.id}" class="plus">+</button></div></article>`).join('')
  if(ideas.length) h+=`<h3 class="ideaTitle">Idées à ajouter à ton parc</h3>`+ideas.map(i=>`<article class="result idea">
    <div class="thumb">·</div><div><h3>${esc(i.name)}</h3><p>${(i.sounds||[]).map(chip).join(' ')}</p>
    <small>Référence externe · ${esc(i.source||'base de référence')}</small></div><button class="plus" data-idea="${esc(i.name)}">+</button></article>`).join('')
  $(target).innerHTML=h
  $$('[data-add]',$(target)).forEach(b=>b.onclick=()=>addToActiveMise(b.dataset.add))
  $$('[data-fav]',$(target)).forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.fav))
  $$('[data-alt]',$(target)).forEach(b=>b.onclick=()=>openAlternatives(b.dataset.alt))
  $$('[data-idea]',$(target)).forEach(b=>b.onclick=()=>openObject({name:b.dataset.idea,source:'suggestion externe',owned:false}))
}
$('#q').addEventListener('input',()=>renderSearch())
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
async function groupPhotoFlow(file){
  if(!file?.type?.startsWith('image/')){toast('Sélectionne une image');return}
  const d=$('#modal'),preview=URL.createObjectURL(file),photo=await resizePhoto(file)
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Photo de groupe</b><small>Créer plusieurs objets depuis une seule photo</small></div><button id="closeGroup" class="ghost">×</button></div><img class="photoPreview" src="${preview}" alt="Photo de groupe"><p id="groupStatus" class="hint">Analyse en cours… Toute proposition devra être validée.</p><div id="groupRows"></div><label>Contenant commun<select id="groupCase"><option value="">Sans contenant</option>${cases.map(c=>`<option value="${c.id}">${esc(caseName(c))}</option>`).join('')}</select></label><button id="saveGroup" disabled>Créer les objets cochés</button></div>`
  d.showModal();const close=()=>{URL.revokeObjectURL(preview);d.close()};$('#closeGroup').onclick=close
  let proposals=[]
  try{proposals=await requestPhotoAnalysis(file,new AbortController().signal);$('#groupStatus').textContent=proposals.length?`${proposals.length} proposition(s) à corriger / valider.`:'Aucune proposition : ajoute les noms manuellement.'}catch{$('#groupStatus').textContent='Analyse indisponible ici. Tu peux quand même saisir plusieurs objets manuellement.'}
  const rows=proposals.length?proposals.slice(0,12):Array.from({length:4},()=>({label:'',category:'autre',quantity:1}))
  $('#groupRows').innerHTML=rows.map((o,i)=>`<div class="groupRow"><input type="checkbox" data-group-check="${i}" ${o.label?'checked':''}><input data-group-name="${i}" value="${esc(o.label||'')}" placeholder="Nom de l’objet"><input data-group-sounds="${i}" placeholder="sons / usages (facultatif)"></div>`).join('')
  $('#saveGroup').disabled=false
  $('#saveGroup').onclick=async()=>{const selected=$$('[data-group-check]:checked',d);if(!selected.length){toast('Coche au moins un objet');return}const caseId=$('#groupCase').value;for(const box of selected){const i=box.dataset.groupCheck,name=$(`[data-group-name="${i}"]`,d).value.trim();if(!name)continue;const sounds=$(`[data-group-sounds="${i}"]`,d).value.split(',').map(x=>x.trim()).filter(Boolean);await db.put('objects',{id:uid('obj'),name,detectedName:proposals[i]?.label||'',sounds,tags:[],contexts:[],photo,caseId,container_id:caseId,family:'À classer',source:'photo de groupe',owned:true,status:'available',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}scheduleDriveSync();await refresh();render();close();toast('Objets créés depuis la photo')}
}

async function photoFlow(file){
  const targetId=photoTargetMiseId;photoTargetMiseId=null
  if(!file.type.startsWith('image/')){toast('Sélectionnez un fichier image');return}
  const mise=miseBy(targetId)
  if(mise){openMisePhotoControl(mise,file);return}
  try{openObject({photo:await resizePhoto(file),source:'photo',owned:true})}
  catch{toast('Impossible de lire cette image')}
}
function openMisePhotoControl(m,file){
  const d=$('#modal'),expected=(m.objectIds||[]).map(id=>objects.find(o=>o.id===id)).filter(Boolean)
  const controller=new AbortController(),preview=URL.createObjectURL(file)
  let detectedObjects=[],analysisStatus='pending',analysisError=null,analysedAt=null,finished=false
  const cleanup=()=>{finished=true;controller.abort();clearTimeout(timeout);URL.revokeObjectURL(preview)}
  const timeout=setTimeout(()=>controller.abort(),25000)
  d.innerHTML=`<form method="dialog" class="form"><div class="dialoghead"><div><b>Contrôle photo</b><small>${esc(m.name)}</small></div><button value="cancel" class="ghost" aria-label="Fermer">Fermer</button></div>
  <img class="photoPreview" src="${preview}" alt="Photo du matériel à contrôler">
  <p class="hint">L’image originale est envoyée au service d’analyse. La reconnaissance peut omettre ou confondre des objets. Seule votre validation fait foi.</p>
  <div id="analysisStatus" class="analysisStatus" role="status">Analyse en cours. Vous pouvez déjà effectuer le contrôle manuel.</div>
  <div id="detectedProposals"></div>
  <h3>Objets attendus · validation humaine</h3><p class="hint">Cochez les objets réellement vérifiés pour ce contrôle. Confirmer une proposition ne coche pas cette liste.</p>
  <div class="checklist">${expected.map(o=>`<label class="check"><input type="checkbox" value="${esc(o.id)}"><span>${esc(o.name)} <small>· ${esc(caseName(caseBy(o.caseId||o.container_id)))}</small></span></label>`).join('')||'<p class="hint">Aucun objet attendu. Ajoutez des objets à la mise depuis la recherche.</p>'}</div>
  <p id="controlSaveError" class="syncWarning" role="alert" hidden></p>
  <button id="savePhotoControl">Enregistrer le contrôle manuel</button></form>`
  d.addEventListener('close',cleanup,{once:true})
  d.showModal()
  requestPhotoAnalysis(file,controller.signal).then(proposals=>{
    if(finished)return
    detectedObjects=proposals;analysisStatus='available';analysedAt=new Date().toISOString()
    $('#analysisStatus').textContent=proposals.length?`${proposals.length} proposition(s) à examiner. Aucune n’est validée automatiquement.`:'Aucun objet proposé par le service. Poursuivez avec la liste manuelle.'
    $('#detectedProposals').innerHTML=proposals.length?`<h3>Propositions du service</h3><div class="proposals">${proposals.map((o,i)=>`<label class="check"><input type="checkbox" data-proposal="${i}"><span>${esc(o.label)} <small>· ${esc(o.category)} · ×${o.quantity}${o.confidence!==undefined?` · score ${Math.round(o.confidence*100)} %`:''}</small><small class="proposalNote">Confirmer cet objet visible · proposition non ajoutée automatiquement à Data Bruitage</small></span></label>`).join('')}</div><p class="hint">Ces propositions ne modifient pas Data Bruitage.</p>`:''
    $('#savePhotoControl').textContent='Valider et enregistrer le contrôle'
  }).catch(error=>{
    if(finished)return
    analysisStatus='unavailable'
    analysisError=error.name==='AbortError'?'Délai d’analyse dépassé':error.message
    $('#analysisStatus').textContent='Analyse indisponible. Utilisez la liste manuelle ; aucune reconnaissance n’a été validée.'
  }).finally(()=>clearTimeout(timeout))
  $('#savePhotoControl').onclick=async e=>{
    e.preventDefault()
    const button=e.currentTarget;button.disabled=true
    const details={method:analysisStatus==='available'?'photo-assisted':'manual-photo',analysisStatus:analysisStatus==='pending'?'cancelled':analysisStatus,analysisError,analysedAt,
      detectedObjects:detectedObjects.map((o,i)=>({...o,validated:!!$(`[data-proposal="${i}"]`,d)?.checked})),
      file:{name:file.name,type:file.type,size:file.size,lastModified:file.lastModified}}
    const next={...m,checked:$$('.checklist input:checked',d).map(x=>x.value)}
    recordControl(next,details)
    // Freeze the submitted review before allowing late network responses to update it.
    finished=true;controller.abort();clearTimeout(timeout)
    try{
      try{next.controlPhoto=await resizePhoto(file)}catch{next.controlPhoto=''}
      await saveMise(next);d.close();await refresh();render();toast('Contrôle validé et enregistré')
    }catch{
      $('#controlSaveError').hidden=false
      $('#controlSaveError').textContent='Enregistrement impossible. Vérifiez l’espace disponible et réessayez.'
      button.disabled=false
    }
  }
}
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
  const o=current||{id:uid('obj'),name:p.name||'',detectedName:'',sounds:p.sounds||[],tags:[],contexts:[],photo:p.photo||'',caseId:'',family:'À classer',source:p.source||'manuel',owned:p.owned??true,status:'available'}
  const m=$('#modal')
  m.innerHTML=`<form method="dialog" class="form"><div class="dialoghead"><div><b>${current?'Modifier':'Ajouter'} un objet</b><small>Nom libre et personnel</small></div><button value="cancel" class="ghost">×</button></div>
  ${o.photo?`<img class="photoPreview" src="${o.photo}">`:''}
  <div class="objectQuick"><button type="button" id="favObject" class="ghost">${o.favorite?'★ Favori':'☆ Favori'}</button>${current?'<button type="button" id="qrObject" class="ghost">QR objet</button>':''}<button type="button" id="audioMemo" class="ghost">${o.audioMemo?'Réenregistrer mémo sonore':'Enregistrer un mémo sonore'}</button></div>
  ${o.audioMemo?`<audio controls src="${o.audioMemo}"></audio>`:''}
  <label>Nom<input id="fName" value="${esc(o.name)}" placeholder="Bouteille frangée"></label>
  <div class="grid2"><label>Famille<select id="fFamily">${['Vie quotidienne','Musique & percussions','Nature & matières','Pas & surfaces','Eau & liquides','Vent & air','Feu & textures','Animaux & voix','Technique audio','Technique scène','À classer'].map(x=>`<option ${o.family===x?'selected':''}>${x}</option>`)}</select></label>
  <label>Contenant<select id="fCase"><option value="">Sans contenant</option>${cases.map(c=>`<option value="${c.id}" ${(o.caseId||o.container_id)===c.id?'selected':''}>${esc(caseName(c))}</option>`)}</select></label></div>
  <label>Sons / usages<input id="fSounds" value="${esc((o.sounds||[]).join(', '))}" placeholder="mer, pluie, vent…"></label>
  <label>Tags / contexte<input id="fTags" value="${esc(unique([...(o.tags||[]),...(o.contexts||[])]).join(', '))}" placeholder="atelier, kit perso, #spectacle…"></label>
  ${(o.locationHistory||[]).length?`<details><summary>Historique de rangement</summary><div class="historyList">${(o.locationHistory||[]).slice().reverse().slice(0,12).map(h=>`<small>${esc(new Date(h.at).toLocaleString('fr-FR'))} · ${esc(caseName(caseBy(h.from)))} → ${esc(caseName(caseBy(h.to)))}</small>`).join('')}</div></details>`:''}
  <div class="row"><button type="button" id="pickGallery" class="ghost">Importer photo</button><button type="button" id="pickCamera" class="ghost">Appareil photo</button><button id="saveObject">Enregistrer</button></div></form>`
  m.showModal()
  $('#pickGallery').onclick=()=>pickPhoto('galleryInput')
  $('#pickCamera').onclick=()=>pickPhoto('photoInput')
  $('#favObject').onclick=()=>{o.favorite=!o.favorite;$('#favObject').textContent=o.favorite?'★ Favori':'☆ Favori'}
  if($('#qrObject'))$('#qrObject').onclick=()=>showObjectQr(o)
  $('#audioMemo').onclick=e=>captureAudioMemo(o,e.currentTarget)
  $('#saveObject').onclick=async e=>{
    e.preventDefault()
    const tags=$('#fTags').value.split(',').map(x=>x.trim()).filter(Boolean)
    const previousCase=current?(current.caseId||current.container_id||''):(o.caseId||o.container_id||''),nextCase=$('#fCase').value
    if(previousCase!==nextCase)o.locationHistory=[...(o.locationHistory||[]),{at:new Date().toISOString(),from:previousCase,to:nextCase,method:'fiche'}]
    Object.assign(o,{
      name:$('#fName').value.trim()||'Objet sans nom',
      family:$('#fFamily').value,
      caseId:nextCase,container_id:nextCase,
      sounds:$('#fSounds').value.split(',').map(x=>x.trim()).filter(Boolean),
      tags,contexts:tags,updatedAt:new Date().toISOString()
    })
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
  <label>Type<select id="cType">${['Valise','Boîte','Bac','Sac','Flight-case','Trousse'].map(x=>`<option ${norm(c.type)===norm(x)?'selected':''}>${x}</option>`)}</select></label>
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
  const url=location.href.split('?')[0]+'?case='+encodeURIComponent(id)
  const qr=await QRCode.toDataURL(url,{width:520,margin:2,errorCorrectionLevel:'M'})
  const m=$('#modal')
  m.innerHTML=`<div class="caseView"><div class="dialoghead"><div><b>${esc(caseName(c))}</b><small>${items.length} objet${items.length>1?'s':''}</small></div><button class="ghost" id="closeCase">×</button></div>
  <img class="qr" src="${qr}"><code>${esc(c.id)}</code>
  <div class="miniList">${items.map(o=>`<span>${esc(o.name)}</span>`).join('')}</div>
  <div class="row"><button id="caseCreator">Avec ce que j’ai ici</button><button id="printLabel">Étiquette / imprimer</button><button id="editCase" class="ghost">Modifier</button></div></div>`
  m.showModal()
  $('#closeCase').onclick=()=>m.close()
  $('#caseCreator').onclick=()=>{m.close();openCaseCreator(c)}
  $('#printLabel').onclick=()=>openPrint(c,qr)
  $('#editCase').onclick=()=>{m.close();openCase(c)}
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
  await saveMise(m);activeMise=m.id;await refresh();render();toast('Ajouté à la mise')
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
  const methods={manual:'Liste manuelle','manual-photo':'Liste manuelle avec photo','photo-assisted':'Photo et validation humaine'}
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

function hasNativePrinter(){return Boolean(window.MiseAndroidPrinter&&typeof window.MiseAndroidPrinter.listPairedPrinters==='function')}
function nativePrinterDevices(){
  if(!hasNativePrinter())return[]
  try{return JSON.parse(window.MiseAndroidPrinter.listPairedPrinters()||'[]').sort((a,b)=>Number(b.likelyPrinter)-Number(a.likelyPrinter))}catch{return[]}
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
function wrapCanvasText(ctx,text,maxWidth){
  const words=String(text||'').split(/\s+/),lines=[];let line=''
  for(const word of words){const next=(line+' '+word).trim();if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word}else line=next}
  if(line)lines.push(line);return lines
}
async function makeThermalLabel({title='MISE !',qrDataUrl='',subtitle='',logoOnly=false}){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=logoOnly?190:500
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';ctx.textAlign='center'
  ctx.font='900 70px Arial, sans-serif';ctx.fillText('MISE !',192,82)
  ctx.font='700 18px Arial, sans-serif';ctx.fillText('QR CASE FINDER',192,112)
  if(logoOnly){ctx.font='16px Arial, sans-serif';ctx.fillText('Test imprimante · MISE !',192,154);return canvas.toDataURL('image/png')}
  ctx.fillRect(28,132,328,3)
  if(title&&title!=='MISE !'){ctx.font='700 22px Arial, sans-serif';const lines=wrapCanvasText(ctx,title,330).slice(0,2);lines.forEach((line,i)=>ctx.fillText(line,192,168+i*26))}
  let qrTop=title&&title!=='MISE !'?220:165
  if(qrDataUrl){const qr=await loadImage(qrDataUrl);ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,72,qrTop,240,240)}
  if(subtitle){ctx.font='14px Arial, sans-serif';const lines=wrapCanvasText(ctx,subtitle,340).slice(0,2);lines.forEach((line,i)=>ctx.fillText(line,192,qrTop+270+i*18))}
  return canvas.toDataURL('image/png')
}
async function makePrinterTestImages(){
  const target='https://art.acousmatic-theatre.fr/mise-app/'
  const qr=await QRCode.toDataURL(target,{width:280,margin:1,errorCorrectionLevel:'M'})
  return [await makeThermalLabel({logoOnly:true}),await makeThermalLabel({title:'MISE !',qrDataUrl:qr,subtitle:'Scanne pour ouvrir MISE !'})]
}
async function nativePrint(address,images){
  if(!hasNativePrinter()){toast('Le pilote natif est disponible dans l’app Android MISE !');return false}
  if(!address){toast('Choisis d’abord une imprimante');return false}
  try{window.MiseAndroidPrinter.printImages(address,JSON.stringify(images));return true}catch(error){toast('Impossible de lancer l’impression native');return false}
}
async function openNativePrinterDialog(){
  const d=$('#modal'),devices=nativePrinterDevices(),saved=await db.get('settings','printer')
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Imprimante thermique</b><small>WalkPrint / YHK · pilote Android expérimental</small></div><button id="closeNativePrinter" class="ghost">×</button></div>
  <p class="hint">Jumelle d’abord l’imprimante dans Android. Les modèles WalkPrint de cette famille apparaissent souvent comme « YHK-… » ou « Mini Printer ».</p>
  <div class="printerDevices">${devices.map(device=>`<button class="printerDevice ${saved?.deviceId===device.address?'selected':''}" data-native-printer="${esc(device.address)}" data-native-name="${esc(device.name)}"><b>${device.likelyPrinter?'● ':''}${esc(device.name)}</b><small>${esc(device.address)}${device.likelyPrinter?' · profil probable WalkPrint/YHK':''}</small></button>`).join('')||'<div class="empty">Aucune imprimante appairée détectée.</div>'}</div>
  <div class="row"><button id="openBtSettings" class="ghost">Réglages Bluetooth Android</button><button id="refreshNativePrinters" class="ghost">Actualiser</button></div>
  <div class="printerTest"><b>Test prêt</b><span>Étiquette 1 : logo MISE ! · Étiquette 2 : logo + trait + QR vers MISE !</span><button id="runPrinterTest" ${!saved?.deviceId?'disabled':''}>Imprimer les 2 étiquettes test</button></div></div>`
  d.showModal();$('#closeNativePrinter').onclick=()=>d.close();$('#openBtSettings').onclick=()=>window.MiseAndroidPrinter.openBluetoothSettings();$('#refreshNativePrinters').onclick=()=>{d.close();setTimeout(openNativePrinterDialog,250)}
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
  d.innerHTML=`<div class="form"><div class="dialoghead"><div><b>Imprimer une série de QR</b><small>Valises et caisses</small></div><button id="closeBatch" class="ghost">×</button></div><div class="checklist">${cases.map(c=>`<label class="check"><input type="checkbox" data-print-case value="${c.id}" checked><span>${esc(caseName(c))}</span></label>`).join('')||'<p>Aucun contenant.</p>'}</div><button id="makeBatch">Préparer les étiquettes</button><div id="batchLabels" class="batchLabels"></div></div>`
  d.showModal();$('#closeBatch').onclick=()=>d.close();$('#makeBatch').onclick=async()=>{const ids=$$('[data-print-case]:checked',d).map(x=>x.value),selected=cases.filter(c=>ids.includes(c.id));if(!selected.length){toast('Sélectionne au moins une valise');return}const labels=[];for(const c of selected){const url=location.href.split('?')[0]+'?case='+encodeURIComponent(c.id),qr=await QRCode.toDataURL(url,{width:420,margin:2,errorCorrectionLevel:'M'});labels.push(`<div class="labelPreview batchLabel"><strong>${esc(caseName(c))}</strong><img src="${qr}"><small>${esc(c.id)}</small></div>`)}$('#batchLabels').innerHTML=labels.join('')+`<div class="row"><button id="printBatchNow">Impression système</button></div>`;$('#printBatchNow').onclick=()=>window.print()}
}

async function updatePrinterStatus(){
  const saved=await db.get('settings','printer')
  const label=saved?.name?`Imprimante · ${saved.name}`:'Imprimante · À connecter'
  const button=$('#printerBtn');if(button){button.textContent=label;button.classList.toggle('connected',Boolean(saved))}
}
window.addEventListener('mise-native-printer-status',event=>{const message=String(event.detail||'');if(message)toast(message)})

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
  let caseId='',objectId=''
  try{const u=new URL(text);caseId=u.searchParams.get('case')||'';objectId=u.searchParams.get('object')||''}catch{if(caseBy(text))caseId=text;else if(objectBy(text))objectId=text}
  return {caseId,objectId,text}
}
async function handleScanTarget(target){
  if(scanPurpose!=='move'){
    if(target.caseId&&caseBy(target.caseId))return showCase(target.caseId)
    if(target.objectId&&objectBy(target.objectId))return openObject(objectBy(target.objectId))
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
  const hint=$('.hint',d);if(hint)hint.textContent=scanPurpose==='move'?(moveScanState?.step==='source'?'1/3 · Scanne la valise source':moveScanState?.step==='object'?'2/3 · Scanne le QR de l’objet':'3/3 · Scanne la valise destination'):'Scanne le QR d’une valise, d’une caisse ou d’un objet.'
  scanner=new BrowserQRCodeReader();let handled=false
  try{
    await scanner.decodeFromVideoDevice(undefined,$('#scanVideo'),(result)=>{
      if(!result||handled)return;handled=true;const target=parseScannedTarget(result.getText());stopScan();void handleScanTarget(target)
    })
  }catch{toast('Impossible d’ouvrir la caméra')}
}
function stopScan(){
  try{scanner?.reset()}catch{}
  scanner=null
  const d=$('#scanDlg');if(d?.open)d.close()
}
$('#stopScan').onclick=()=>{stopScan();if(scanPurpose==='move'){scanPurpose='browse';moveScanState=null;toast('Déplacement annulé')}}

function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!SR){toast('Dictée non disponible dans ce navigateur');return}
  const r=new SR();r.lang='fr-FR';r.interimResults=true;r.continuous=false
  $('#mic').classList.add('listening')
  r.onresult=e=>{
    let t='';for(const x of e.results)t+=x[0].transcript+' '
    $('#q').value=t.trim();renderSearch()
  }
  r.onend=()=>$('#mic').classList.remove('listening')
  r.start()
}
$('#mic').onclick=startVoice
$('#accountBtn').onclick=connectGoogle
$('#goalGoogle').onclick=connectGoogle
$('#printerBtn').onclick=pairPrinter
$('#goalPrinter').onclick=pairPrinter
$('#manualBtn').onclick=()=>$('#manualDlg').showModal()
$('#goalManual').onclick=()=>$('#manualDlg').showModal()
$('#closeManual').onclick=()=>$('#manualDlg').close()
$('#goalBackup').onclick=()=>$('#backupBtn').click()
$('#goalRestore').onclick=()=>$('#restoreInput').click()
$('#goalGroupPhoto').onclick=()=>$('#groupPhotoInput').click()
$('#goalChallenge').onclick=openChallenge
$('#goalMove').onclick=startMoveScans
$('#goalShare').onclick=openShareDialog
$('#goalBatchPrint').onclick=openBatchPrint
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
const isStandalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true
if(isIOS&&!isStandalone){$('#goalIosInstall').hidden=false;$('#goalIosInstall').onclick=()=>{$('#manualDlg').showModal();setTimeout(()=>$('#manualIos')?.scrollIntoView({block:'center',behavior:'smooth'}),80)}}
if(isIOS&&isStandalone){setTimeout(async()=>{const account=await db.get('settings','google-account');if(!account&&!objects.length&&!cases.length)toast('MISE ! installée · reconnecte Google ou importe ta sauvegarde si tu en avais une dans Safari')},700)}
updatePrinterStatus();updateAccountStatus()

$$('[data-action]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.action
  if(a==='search'){setTab('search');$('#q').focus()}
  if(a==='speak')startVoice()
  if(a==='photo')pickPhoto('photoInput')
  if(a==='scan')startScan()
})
$$('[data-preset]').forEach(b=>b.onclick=()=>{
  $('#q').value=b.dataset.preset;renderCreator()
})

function renderCreator(){
  const q=$('#q').value.trim()||'mer'
  $('#creatorResults').innerHTML='<div class="panel"><b>Ton parc</b></div><div id="creatorOwned"></div><div class="panel"><b>Autres pistes</b><p class="hint">Suggestions, jamais confondues avec ton inventaire.</p></div><div id="creatorIdeas"></div>'
  renderSearch('#creatorOwned')
  const ideas=searchExternal(q)
  $('#creatorIdeas').innerHTML=ideas.length?ideas.map(i=>`<article class="result idea"><div class="thumb">·</div><div><h3>${esc(i.name)}</h3><p>${(i.sounds||[]).map(chip).join(' ')}</p><small>${esc(i.source||'référence')}</small></div></article>`).join(''):'<div class="empty">Pas encore d’autre piste indexée pour cette recherche.</div>'
}

function render(){
  renderSearch()
  $('#objectCards').innerHTML=objects.slice().sort((a,b)=>(Number(b.favorite)-Number(a.favorite))||a.name.localeCompare(b.name,'fr')).map(o=>`<button class="card objectCard" data-object="${o.id}">
    <b>${o.favorite?'★ ':''}${esc(o.name)}</b><span>${(o.sounds||[]).slice(0,4).join(' · ')||'Son à préciser'}</span><small>${esc(caseName(caseBy(o.caseId||o.container_id)))}${o.audioMemo?' · mémo sonore':''}</small></button>`).join('')
  $$('[data-object]').forEach(b=>b.onclick=()=>openObject(objects.find(o=>o.id===b.dataset.object)))

  $('#caseCards').innerHTML=cases.map(c=>`<button class="card caseCard" data-case="${c.id}"><b>${esc(caseName(c))}</b><span>${objects.filter(o=>(o.caseId||o.container_id)===c.id).length} objets</span><small>QR prêt</small></button>`).join('')
  $$('[data-case]').forEach(b=>b.onclick=()=>showCase(b.dataset.case))

  $('#kitCards').innerHTML=kits.map(k=>`<article class="card"><b>${esc(k.name)}</b><span>${(k.objectIds||[]).length} objets · ${esc((k.contexts||[]).join(' · ')||'indépendant')}</span><small>${esc(k.source||'manuel')}</small>
    <div class="row"><button data-prep="${k.id}">Préparer demain</button><button data-editkit="${k.id}" class="ghost">Modifier</button></div></article>`).join('')
  $$('[data-prep]').forEach(b=>b.onclick=()=>createMiseFromKit(kitBy(b.dataset.prep)))
  $$('[data-editkit]').forEach(b=>b.onclick=()=>openKit(kitBy(b.dataset.editkit)))

  $('#miseCards').innerHTML=mises.length?mises.map(m=>`<article class="card ${activeMise===m.id?'activeMise':''}">
    <div class="miseTitle"><b>${esc(m.name)}</b><button class="link" data-active="${m.id}">${activeMise===m.id?'Active':'Activer'}</button></div>
    <span>${(m.objectIds||[]).length} objets · ${(m.checked||[]).length} contrôlés</span>
    <div class="checklist">${(m.objectIds||[]).map(id=>objects.find(o=>o.id===id)).filter(Boolean).map(o=>`<label class="check"><input type="checkbox" data-mise="${m.id}" value="${o.id}" ${(m.checked||[]).includes(o.id)?'checked':''}><span>${esc(o.name)} <small>· ${esc(caseName(caseBy(o.caseId||o.container_id)))}</small></span></label>`).join('')}</div>
    <div class="row"><button data-control="${m.id}">📷 Contrôle photo · bêta</button><button data-editmise="${m.id}" class="ghost">Modifier</button></div>
  </article>`).join(''):'<div class="empty">Crée une mise ou ouvre un kit puis « Préparer demain ».</div>'
  $$('[data-active]').forEach(b=>b.onclick=()=>{activeMise=b.dataset.active;render()})
  $$('#miseCards .check input').forEach(x=>x.onchange=()=>toggleCheck(miseBy(x.dataset.mise),x.value,x.checked))
  $$('[data-editmise]').forEach(b=>b.onclick=()=>openMise(miseBy(b.dataset.editmise)))
  $$('[data-control]').forEach(b=>b.onclick=()=>{activeMise=b.dataset.control;photoTargetMiseId=b.dataset.control;$('#photoInput').click()})
}
render()

$('#backupBtn').onclick=async()=>{
  const payload={version:1,exportedAt:new Date().toISOString(),objects:await db.getAll('objects'),cases:await db.getAll('cases'),kits:await db.getAll('kits'),mises:await db.getAll('mises')}
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MISE-backup.json';a.click();URL.revokeObjectURL(a.href)
}

$('#restoreInput').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return
  try{const payload=JSON.parse(await file.text());if(!confirm('Importer cette sauvegarde MISE ! et remplacer les données locales de cet appareil ?'))return;await applyPrivateState(payload);scheduleDriveSync();toast('Sauvegarde importée')}catch(error){toast(error instanceof Error?error.message:'Import impossible')}finally{event.target.value=''}
}

if(params.get('shareFile'))setTimeout(()=>openSharedPackage(params.get('shareFile')),300)
else if(params.get('case'))setTimeout(()=>showCase(params.get('case')),250)
else if(params.get('object'))setTimeout(()=>{const o=objectBy(params.get('object'));if(o)openObject(o)},250)
