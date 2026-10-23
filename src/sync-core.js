import { DATA_STORES } from './data-bruitage.js'
import { isOwnerPrivateAccount, normalizeOwnerSeedObject } from './owner-private.js'
import { supabaseClient, supabaseSession } from './supabase-client.js'
import { decideSync, conflictEntry, appendConflicts, stripSyncMeta, localTime } from './sync-decision.js'
import { photoRemotePath, QUEUE_ID, enqueuePhoto, markPhotoDone, markPhotoFailed, pendingPhotos } from './photos.js'
import { DELETION_QUEUE_ID, deleteLocalRecord, deletionKey, processDeletionQueue, tombstoneAction } from './record-purge.js'

const BUCKET='mises-photos'
const SYNC_STORES=[...DATA_STORES,'kits','learnings'].filter(name=>name!=='settings')

const isoNow=()=>new Date().toISOString()
const clone=value=>structuredClone(value)

function dataUrlParts(value){
  if(typeof value!=='string'||!value.startsWith('data:image/')) return null
  const match=value.match(/^data:(image\/[^;]+);base64,(.+)$/)
  return match?{mime:match[1],base64:match[2]}:null
}
async function dataUrlBlob(value){
  const response=await fetch(value)
  return response.blob()
}
async function blobDataUrl(blob){
  return await new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=()=>resolve(reader.result)
    reader.onerror=()=>reject(reader.error||new Error('Lecture photo impossible'))
    reader.readAsDataURL(blob)
  })
}
function remotePath(spaceId,store,recordId){
  const safe=v=>String(v).replace(/[^a-zA-Z0-9._-]/g,'_')
  return `${spaceId}/${safe(store)}/${safe(recordId)}.jpg`
}
function isOwnerPrivateRow(row){
  const scope=String(row?.publicationScope||'').toUpperCase()
  const tags=Array.isArray(row?.tags)?row.tags:[]
  return scope==='PRIVE_ONLY' || tags.includes('data-bruitage-v5')
}
function shouldSync(store,row,session){
  if(!row||!row.id) return false
  if(store==='objects' && row.owned===false) return false
  // Corpus Data Bruitage V5 privé : uniquement le compte propriétaire via Supabase.
  if(isOwnerPrivateRow(row) && !isOwnerPrivateAccount(session?.user?.email)) return false
  return true
}
/** Publication de l'inventaire (opt-in propriétaire, RLS update owner-only) : lecture seule via les QR. */
export async function setPublicInventory(published){
  const session=await supabaseSession();if(!session?.user)throw new Error('Connecte-toi d’abord')
  const supabase=await supabaseClient()
  const spaceId=await ensurePersonalSpace(supabase,session.user)
  const {error}=await supabase.from('mises_spaces').update({public_inventory:Boolean(published)}).eq('id',spaceId).eq('owner_id',session.user.id)
  if(error)throw error
  return Boolean(published)
}
export async function getPublicInventory(){
  const session=await supabaseSession();if(!session?.user)return false
  const supabase=await supabaseClient()
  const {data}=await supabase.from('mises_spaces').select('public_inventory').eq('owner_id',session.user.id).limit(1)
  return Boolean(data?.[0]?.public_inventory)
}
export async function claimOwnerSeed(supabase){
  try{const {data,error}=await supabase.rpc('mises_claim_owner_seed');if(error)throw error;return Number(data)||0}
  catch{return 0}
}
async function ensurePersonalSpace(supabase,user){
  const {data:members,error}=await supabase.from('mises_memberships').select('space_id,role').eq('user_id',user.id)
  if(error) throw error
  if(members?.length) return members.find(m=>m.role==='owner')?.space_id||members[0].space_id
  const {data:space,error:createError}=await supabase.from('mises_spaces').insert({owner_id:user.id,name:'Mon stock MISES!',kind:'personal'}).select('id').single()
  if(createError) throw createError
  const {error:memberError}=await supabase.from('mises_memberships').insert({space_id:space.id,user_id:user.id,role:'owner'})
  if(memberError) throw memberError
  return space.id
}
// Supabase/PostgREST limits the number of rows returned per request (often 1,000).
// Read every page before comparing any local record: a partial cloud snapshot could
// otherwise make an existing remote entry look missing and overwrite it.
export async function fetchAllRemoteRecords(supabase,spaceId,{pageSize=500}={}){
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>1000) throw new RangeError('Taille de page invalide')
  const rows=[]
  for(let offset=0;;offset+=pageSize){
    const {data,error}=await supabase.from('mises_records')
      .select('space_id,store_name,record_id,payload,updated_by,updated_at,deleted_at,revision')
      .eq('space_id',spaceId)
      .order('store_name',{ascending:true})
      .order('record_id',{ascending:true})
      .range(offset,offset+pageSize-1)
    if(error) throw error
    const page=data||[]
    rows.push(...page)
    if(page.length<pageSize) return rows
  }
}

async function uploadBlob(supabase,spaceId,store,recordId,path,dataUrl,kind='photo'){
  const parsed=dataUrlParts(dataUrl)
  if(!parsed) return null
  const blob=await dataUrlBlob(dataUrl)
  const {error}=await supabase.storage.from(BUCKET).upload(path,blob,{upsert:true,contentType:parsed.mime,cacheControl:'31536000'})
  if(error) throw error
  const {error:assetError}=await supabase.from('mises_assets').upsert({
    space_id:spaceId,store_name:store,record_id:recordId,path,mime_type:parsed.mime,bytes:blob.size,kind,created_by:(await supabaseSession()).user.id,updated_at:isoNow()
  },{onConflict:'path'})
  if(assetError) throw assetError
  return path
}
/** Envoie les photos locales (photos[] + ancienne photo unique) ; le payload distant ne garde que chemins + miniatures. */
async function preparePayload(supabase,spaceId,store,row){
  const payload=stripSyncMeta(clone(row))
  if(Array.isArray(payload.photos)){
    for(const p of payload.photos){
      if(!p.remotePath&&p.dataUrl){
        p.remotePath=await uploadBlob(supabase,spaceId,store,row.id,photoRemotePath(spaceId,store,row.id,p.id),p.dataUrl)
      }
      if(p.remotePath){delete p.dataUrl;p.status='uploaded'}
    }
    payload.photoAssetPaths=payload.photos.map(p=>p.remotePath).filter(Boolean)
  }
  if(payload.photo){
    const legacy=payload.photos?.find(p=>p.legacy&&p.remotePath)
    const path=legacy?.remotePath||await uploadBlob(supabase,spaceId,store,row.id,remotePath(spaceId,store,row.id),payload.photo)
    if(path){delete payload.photo;payload.photoAssetPath=path}
  }
  return payload
}
async function hydratePhoto(supabase,payload){
  if(!payload?.photoAssetPath||payload.photo) return payload
  const next=clone(payload)
  try{
    const {data,error}=await supabase.storage.from(BUCKET).download(payload.photoAssetPath)
    if(error) throw error
    next.photo=await blobDataUrl(data)
  }catch{ /* hors-ligne : la miniature reste, l'original sera relu via URL signée */ }
  return next
}
/** URL signée (bucket privé). */
export async function signedPhotoUrl(path,{expiresIn=3600}={}){
  const supabase=await supabaseClient()
  const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,expiresIn)
  if(error) throw error
  return data.signedUrl
}
/** Vide la file hors-ligne : chaque photo locale est envoyée puis marquée remotePath dans la fiche. */
async function flushPhotoQueue(db,supabase,spaceId){
  const entry=await db.get('settings',QUEUE_ID)
  let queue=entry?.queue||[];let sent=0
  for(const item of pendingPhotos(queue)){
    try{
      const row=await db.get(item.store,item.recordId)
      const photo=row?.photos?.find(p=>p.id===item.photoId)
      if(!photo||photo.remotePath||!photo.dataUrl){queue=markPhotoDone(queue,item);continue}
      photo.remotePath=await uploadBlob(supabase,spaceId,item.store,row.id,photoRemotePath(spaceId,item.store,row.id,photo.id),photo.dataUrl)
      photo.status='uploaded'
      row.updatedAt=isoNow()
      await db.put(item.store,row)
      queue=markPhotoDone(queue,item);sent++
    }catch(error){queue=markPhotoFailed(queue,item,error)}
  }
  await db.put('settings',{id:QUEUE_ID,queue,at:isoNow()})
  return sent
}
export async function queuePhotoUpload(db,item){
  const entry=await db.get('settings',QUEUE_ID)
  await db.put('settings',{id:QUEUE_ID,queue:enqueuePhoto(entry?.queue||[],item),at:isoNow()})
}

async function pushRecord(supabase,spaceId,store,row,cloud,base,session){
  const payload=await preparePayload(supabase,spaceId,store,row)
  const lt=localTime(row), revision=(cloud?.revision||0)+1
  if(!cloud){
    const {error}=await supabase.from('mises_records').insert({space_id:spaceId,store_name:store,record_id:row.id,payload,updated_by:session.user.id,updated_at:lt,deleted_at:null,revision:1})
    if(error){ if(error.code==='23505') return {conflict:true}; throw error }
    return {revision:1,payload}
  }
  // Mise à jour conditionnelle : échoue (0 ligne) si quelqu'un a poussé entre-temps.
  const {data,error}=await supabase.from('mises_records')
    .update({payload,updated_by:session.user.id,updated_at:lt,deleted_at:null,revision})
    .eq('space_id',spaceId).eq('store_name',store).eq('record_id',row.id).eq('revision',cloud.revision||0)
    .select('revision')
  if(error) throw error
  if(!data?.length) return {conflict:true}
  return {revision,payload}
}

export async function syncMises(db,{onProgress=()=>{}}={}){
  const session=await supabaseSession()
  if(!session?.user) return {ok:false,reason:'not-authenticated',pushed:0,pulled:0,photos:0,conflicts:0}
  const supabase=await supabaseClient()
  const spaceId=await ensurePersonalSpace(supabase,session.user)
  // Seed owner-only (contenants privés du propriétaire, jamais dans le code public) : idempotent, côté serveur,
  // limité au compte dont l'e-mail vérifié correspond. Sans seed pour ce compte : no-op.
  await claimOwnerSeed(supabase)
  let photos=await flushPhotoQueue(db,supabase,spaceId).catch(()=>0)
  const remote=await fetchAllRemoteRecords(supabase,spaceId)
  const remoteMap=new Map((remote||[]).map(r=>[`${r.store_name}::${r.record_id}`,r]))
  const purgeAt=isoNow()
  // Ancien état « supprimé » : transformer toute fiche locale ou distante restante
  // en vraie suppression hors-ligne, avant la réconciliation normale.
  for(const row of await db.getAll('cases')) if(row?.labelState==='deleted'){
    await deleteLocalRecord(db,'cases',row.id,{now:purgeAt})
  }
  for(const cloud of remote) if(SYNC_STORES.includes(cloud.store_name)&&!cloud.deleted_at&&cloud?.payload?.labelState==='deleted'){
    await deleteLocalRecord(db,cloud.store_name,cloud.record_id,{now:purgeAt})
  }
  // La liste initiale reste prioritaire tout au long de cette passe : une fiche
  // supprimée ne peut pas être réimportée si le Storage est momentanément indisponible.
  const deletionEntry=await db.get('settings',DELETION_QUEUE_ID)
  const queuedDeletionKeys=new Set((deletionEntry?.queue||[]).map(item=>deletionKey(item.store,item.recordId)))
  await processDeletionQueue(db,supabase,spaceId,remoteMap,{now:purgeAt,updatedBy:session.user.id})
  let pushed=0,pulled=0,step=0
  const conflicts=[]
  const total=SYNC_STORES.length
  for(const store of SYNC_STORES){
    const localRows=await db.getAll(store)
    for(const row of localRows){
      if(!shouldSync(store,row,session)) continue
      const recordKey=deletionKey(store,row.id)
      if(queuedDeletionKeys.has(recordKey)) continue
      const cloud=remoteMap.get(recordKey)
      const tombstone=tombstoneAction(row,cloud)
      if(tombstone==='delete-local'){
        await db.delete(store,row.id)
        pulled++
        continue
      }
      if(tombstone==='resurrect'){
        const result=await pushRecord(supabase,spaceId,store,row,cloud,cloud.revision||0,session)
        if(result.conflict){conflicts.push(conflictEntry(store,row,cloud));continue}
        const now=isoNow()
        await db.put(store,{...row,photos:result.payload.photos??row.photos,_syncRevision:result.revision,_syncedAt:localTime(row)>now?localTime(row):now})
        pushed++
        photos+=(result.payload.photoAssetPaths||[]).length
        continue
      }
      const decision=decideSync(row,cloud)
      const now=isoNow()
      if(decision.action==='push'){
        const result=await pushRecord(supabase,spaceId,store,row,cloud,decision.base,session)
        if(result.conflict){conflicts.push(conflictEntry(store,row,cloud));continue}
        await db.put(store,{...row,photos:result.payload.photos??row.photos,_syncRevision:result.revision,_syncedAt:localTime(row)>now?localTime(row):now})
        pushed++
        photos+=(result.payload.photoAssetPaths||[]).length
      }else if(decision.action==='pull'){
        const payload=store==='objects'?normalizeOwnerSeedObject(await hydratePhoto(supabase,cloud.payload)):await hydratePhoto(supabase,cloud.payload)
        await db.put(store,{...payload,_syncRevision:cloud.revision||0,_syncedAt:localTime(payload)>now?localTime(payload):now})
        pulled++
      }else if(decision.action==='conflict'){
        conflicts.push(conflictEntry(store,row,cloud))
      }else if(decision.adopt&&cloud){
        await db.put(store,{...row,_syncRevision:cloud.revision||0,_syncedAt:now})
      }
    }
    // Fiches distantes absentes localement
    for(const cloud of remote) if(cloud.store_name===store&&!cloud.deleted_at&&!queuedDeletionKeys.has(deletionKey(store,cloud.record_id))&&!(await db.get(store,cloud.record_id))){
      const payload=store==='objects'?normalizeOwnerSeedObject(await hydratePhoto(supabase,cloud.payload)):await hydratePhoto(supabase,cloud.payload)
      await db.put(store,{...payload,_syncRevision:cloud.revision||0,_syncedAt:isoNow()})
      pulled++
    }
    step++;onProgress({step,total,pushed,pulled,photos,conflicts:conflicts.length})
  }
  if(conflicts.length){
    const log=await db.get('settings','sync-conflicts')
    await db.put('settings',{id:'sync-conflicts',entries:appendConflicts(log?.entries||[],conflicts),at:isoNow()})
  }
  // Entretien opportuniste seulement : un refus RLS/hors-ligne ne doit jamais faire échouer la synchro des fiches.
  if(typeof supabase.rpc==='function') try{await supabase.rpc('mises_purge_tombstones')}catch{}
  await db.put('settings',{id:'supabase-sync',spaceId,at:isoNow(),pushed,pulled,photos,conflicts:conflicts.length,status:conflicts.length?'conflicts':'ok'})
  return {ok:true,spaceId,pushed,pulled,photos,conflicts:conflicts.length}
}
