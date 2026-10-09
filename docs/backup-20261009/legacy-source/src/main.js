
import './style.css'
import Fuse from 'fuse.js'
import QRCode from 'qrcode'
import { BrowserQRCodeReader } from '@zxing/browser'
import { openDB } from 'idb'
import { registerSW } from 'virtual:pwa-register'
import { readProjectContext, requestPhotoAnalysis, makeControlSummary, makeProjectSummary } from './project-control.js'

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
  if(autoKit && autoKit.source==='02_MalettePedago CDRIC V.20.25.docx'){
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

function linkToProject(m){
  if(project.projectId) Object.assign(m,{projectId:project.projectId,projectName:project.projectName,projectType:project.projectType})
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
  publishProject(m)
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
  return fuse.search(expandQuery(q)).slice(0,20).map(x=>({...x.item,_score:x.score}))
}
function searchExternal(q){
  if(!q.trim()) return []
  return new Fuse(external,{keys:['name','sounds','aliases','summary','source','kind'],threshold:.44,ignoreLocation:true})
    .search(expandQuery(q)).slice(0,8).map(x=>x.item)
}
function chip(s){return `<span class="chip">${esc(s)}</span>`}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)}

$('#app').innerHTML=`
<header>
  <div class="brand">
    <div class="wordmark">MISE<span class="brandDot" aria-hidden="true"></span></div>
    <div class="sub">Préparation & contrôle terrain</div>
    <div class="corpusMeta"><b>Data Bruitage</b><span>${esc(corpusSummary)}</span></div>
  </div>
  <div class="headerTools"><span id="networkStatus" class="status" role="status"></span><button id="backupBtn" class="ghost">Sauvegarder</button></div>
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
<nav>
 <button data-tab="search" class="active">Recherche</button>
 <button data-tab="inventory">Inventaire</button>
 <button data-tab="cases">Valises</button>
 <button data-tab="kits">Kits</button>
 <button data-tab="mises">Mises</button>
 <button data-tab="creator">Créateur</button>
</nav>
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
<input id="restoreInput" type="file" accept=".json" hidden>
<dialog id="modal"></dialog>
<dialog id="scanDlg"><div class="dialoghead"><strong>Scanner un QR</strong><button id="stopScan" class="ghost">Fermer</button></div><video id="scanVideo" playsinline></video><p class="hint">Cadre le QR d'une valise ou d'une caisse.</p></dialog>
<dialog id="printDlg"></dialog>
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
  $$('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab===t))
  render()
}
$$('nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab))

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
    <button data-add="${o.id}" class="plus">+</button></article>`).join('')
  if(ideas.length) h+=`<h3 class="ideaTitle">Idées à ajouter à ton parc</h3>`+ideas.map(i=>`<article class="result idea">
    <div class="thumb">·</div><div><h3>${esc(i.name)}</h3><p>${(i.sounds||[]).map(chip).join(' ')}</p>
    <small>Référence externe · ${esc(i.source||'base de référence')}</small></div><button class="plus" data-idea="${esc(i.name)}">+</button></article>`).join('')
  $(target).innerHTML=h
  $$('[data-add]',$(target)).forEach(b=>b.onclick=()=>addToActiveMise(b.dataset.add))
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
  <label>Nom<input id="fName" value="${esc(o.name)}" placeholder="Bouteille frangée"></label>
  <div class="grid2"><label>Famille<select id="fFamily">${['Vie quotidienne','Musique & percussions','Nature & matières','Pas & surfaces','Eau & liquides','Vent & air','Feu & textures','Animaux & voix','Technique audio','Technique scène','À classer'].map(x=>`<option ${o.family===x?'selected':''}>${x}</option>`)}</select></label>
  <label>Contenant<select id="fCase"><option value="">Sans contenant</option>${cases.map(c=>`<option value="${c.id}" ${(o.caseId||o.container_id)===c.id?'selected':''}>${esc(caseName(c))}</option>`)}</select></label></div>
  <label>Sons / usages<input id="fSounds" value="${esc((o.sounds||[]).join(', '))}" placeholder="mer, pluie, vent…"></label>
  <label>Tags / contexte<input id="fTags" value="${esc(unique([...(o.tags||[]),...(o.contexts||[])]).join(', '))}" placeholder="atelier, kit perso, #spectacle…"></label>
  <div class="row"><button type="button" id="pickGallery" class="ghost">Importer photo</button><button type="button" id="pickCamera" class="ghost">Appareil photo</button><button id="saveObject">Enregistrer</button></div></form>`
  m.showModal()
  $('#pickGallery').onclick=()=>pickPhoto('galleryInput')
  $('#pickCamera').onclick=()=>pickPhoto('photoInput')
  $('#saveObject').onclick=async e=>{
    e.preventDefault()
    const tags=$('#fTags').value.split(',').map(x=>x.trim()).filter(Boolean)
    Object.assign(o,{
      name:$('#fName').value.trim()||'Objet sans nom',
      family:$('#fFamily').value,
      caseId:$('#fCase').value,container_id:$('#fCase').value,
      sounds:$('#fSounds').value.split(',').map(x=>x.trim()).filter(Boolean),
      tags,contexts:tags,updatedAt:new Date().toISOString()
    })
    await db.put('objects',o);m.close();await refresh();render();toast('Objet enregistré')
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
    await db.put('cases',c);m.close();await refresh();render();toast(caseName(c)+' enregistré')
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
  <div class="row"><button id="printLabel">Étiquette / imprimer</button><button id="editCase" class="ghost">Modifier</button></div></div>`
  m.showModal()
  $('#closeCase').onclick=()=>m.close()
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
    await db.put('kits',k);m.close();await refresh();render();toast('Kit enregistré')
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

function openPrint(c,qr){
  const d=$('#printDlg')
  d.innerHTML=`<div class="labelPreview"><strong>${esc(caseName(c))}</strong><img src="${qr}"><small>${esc(c.id)}</small></div>
  <div class="row"><button id="systemPrint">Impression système</button><button id="btPrint">Bluetooth</button><button id="closePrint" class="ghost">Fermer</button></div>
  <p class="hint">Bluetooth direct : connexion possible dès maintenant. L'envoi natif d'étiquette dépend du protocole exact de ta petite imprimante.</p>`
  d.showModal()
  $('#closePrint').onclick=()=>d.close()
  $('#systemPrint').onclick=()=>window.print()
  $('#btPrint').onclick=pairPrinter
}
async function pairPrinter(){
  if(!navigator.bluetooth){toast('Web Bluetooth non disponible ici');return}
  try{
    const device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:['battery_service']})
    await db.put('settings',{id:'printer',name:device.name||'Imprimante Bluetooth',deviceId:device.id})
    toast(`Imprimante détectée : ${device.name||'Bluetooth'}`)
  }catch(e){if(e.name!=='NotFoundError') toast('Connexion Bluetooth impossible')}
}

async function startScan(){
  if(!navigator.mediaDevices){toast('Caméra indisponible');return}
  const d=$('#scanDlg');d.showModal()
  scanner=new BrowserQRCodeReader()
  try{
    await scanner.decodeFromVideoDevice(undefined,$('#scanVideo'),(result)=>{
      if(!result)return
      const text=result.getText(); stopScan()
      let id=text
      try{const u=new URL(text);id=u.searchParams.get('case')||u.searchParams.get('object')||text}catch{}
      const c=caseBy(id)
      if(c) showCase(c.id); else toast('QR non reconnu dans cette base')
    })
  }catch{toast('Impossible d’ouvrir la caméra')}
}
function stopScan(){
  try{scanner?.reset()}catch{}
  scanner=null
  $('#scanDlg').close()
}
$('#stopScan').onclick=stopScan

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
  $('#objectCards').innerHTML=objects.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(o=>`<button class="card objectCard" data-object="${o.id}">
    <b>${esc(o.name)}</b><span>${(o.sounds||[]).slice(0,4).join(' · ')||'Son à préciser'}</span><small>${esc(caseName(caseBy(o.caseId||o.container_id)))}</small></button>`).join('')
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

if(params.get('case')) setTimeout(()=>showCase(params.get('case')),250)
