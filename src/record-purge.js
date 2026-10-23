/**
 * Purge MISES! d'une fiche supprimée.
 *
 * Une suppression retire tout de suite la fiche d'IndexedDB et ajoute une entrée
 * dédoublonnée dans `settings/sync-deletions`, afin de survivre au hors-ligne.
 * À la prochaine synchronisation, les objets Storage sont retirés par le client
 * (la base ne peut pas supprimer `storage.objects`), puis les métadonnées
 * `mises_assets`, puis la ligne devient un tombstone sans payload. Ce marqueur
 * permet aux autres appareils d'effacer leur copie ; la migration serveur le
 * purge après 30 jours. Une file locale gagne toujours sur un pull distant.
 */
import { localTime } from './sync-decision.js'

export const DELETION_QUEUE_ID='sync-deletions'
const isoNow=()=>new Date().toISOString()
const keyOf=(store,recordId)=>`${store}::${recordId}`
const isPathInSpace=(path,spaceId)=>typeof path==='string'&&path.startsWith(`${spaceId}/`)
const BUCKET='mises-photos'
const safeSegment=value=>String(value).replace(/[^a-zA-Z0-9._-]/g,'_')

/** Fichiers réellement présents dans Storage pour une fiche (dossier moderne + fichier hérité). */
export async function listRecordObjects(supabase,spaceId,store,recordId){
  const bucket=supabase.storage.from(BUCKET)
  if(typeof bucket.list!=='function') return []
  const folder=`${spaceId}/${safeSegment(store)}`
  const record=safeSegment(recordId)
  const found=[]
  const {data:inside,error:insideError}=await bucket.list(`${folder}/${record}`,{limit:1000})
  if(insideError) throw insideError
  for(const item of inside||[]) if(item?.name&&item.id!==null) found.push(`${folder}/${record}/${item.name}`)
  const {data:legacy,error:legacyError}=await bucket.list(folder,{limit:1000,search:`${record}.jpg`})
  if(legacyError) throw legacyError
  for(const item of legacy||[]) if(item?.name===`${record}.jpg`) found.push(`${folder}/${record}.jpg`)
  return found
}

/** Ajoute une demande une seule fois par fiche ; la première date reste l'horodatage de référence. */
export function enqueueDeletion(queue=[],item){
  if(!item?.store||!item?.recordId) return queue
  if(queue.some(entry=>entry.store===item.store&&entry.recordId===item.recordId)) return queue
  return [...queue,{store:item.store,recordId:item.recordId,at:item.at||isoNow()}]
}

export function dropDeletion(queue=[],item){
  return queue.filter(entry=>entry.store!==item?.store||entry.recordId!==item?.recordId)
}

/** Supprime le cache local puis mémorise la purge distante à rejouer hors connexion. */
export async function deleteLocalRecord(db,store,id,{now=isoNow()}={}){
  const entry=await db.get('settings',DELETION_QUEUE_ID)
  const item={store,recordId:id,at:now}
  await db.delete(store,id)
  await db.put('settings',{id:DELETION_QUEUE_ID,queue:enqueueDeletion(entry?.queue||[],item),at:now})
  return item
}

/** Tous les chemins photo connus pour une fiche, limités strictement à son espace. */
export function remoteAssetPaths(cloudRow={},assetRows=[]){
  const spaceId=cloudRow?.space_id
  if(!spaceId) return []
  const payload=cloudRow?.payload||{}
  const candidates=[
    ...assetRows.map(asset=>asset?.path),
    payload.photoAssetPath,
    ...(Array.isArray(payload.photoAssetPaths)?payload.photoAssetPaths:[]),
    ...(Array.isArray(payload.photos)?payload.photos.map(photo=>photo?.remotePath):[])
  ]
  return [...new Set(candidates.filter(path=>isPathInSpace(path,spaceId)))]
}

/**
 * Retire les fichiers via Storage (RLS client), les métadonnées, puis écrit le
 * tombstone. Sans ligne cloud, la fiche n'a jamais été synchronisée : no-op.
 */
export async function purgeRemoteRecord(supabase,spaceId,store,recordId,cloudRow,{now=isoNow(),updatedBy=null}={}){
  const {data:assetRows,error:assetReadError}=await supabase.from('mises_assets').select('path')
    .eq('space_id',spaceId).eq('store_name',store).eq('record_id',recordId)
  if(assetReadError) throw assetReadError
  // Filet de sûreté : on liste aussi le dossier Storage de la fiche (photo envoyée sans ligne d'asset, fiche jamais
  // synchronisée mais photo déjà partie…).
  const listed=await listRecordObjects(supabase,spaceId,store,recordId)
  const paths=[...new Set([...remoteAssetPaths({...(cloudRow||{}),space_id:spaceId},assetRows||[]),...listed])]
  let removedObjects=[]
  if(paths.length){
    const {data,error:storageError}=await supabase.storage.from(BUCKET).remove(paths)
    if(storageError) throw storageError
    removedObjects=data||[]
    // Un refus RLS peut renvoyer une liste vide sans erreur : vérifier qu'il ne reste rien.
    const leftovers=await listRecordObjects(supabase,spaceId,store,recordId)
    if(leftovers.length) throw new Error(`Purge Storage incomplète (${leftovers.length} fichier(s))`)
  }
  if(!cloudRow){
    if((assetRows||[]).length){
      const {error}=await supabase.from('mises_assets').delete().eq('space_id',spaceId).eq('store_name',store).eq('record_id',recordId)
      if(error) throw error
    }
    return {removedObjects}
  }
  const {error:assetDeleteError}=await supabase.from('mises_assets').delete()
    .eq('space_id',spaceId).eq('store_name',store).eq('record_id',recordId)
  if(assetDeleteError) throw assetDeleteError
  const revision=(cloudRow.revision||0)+1
  const tombstone={payload:{},deleted_at:now,updated_at:now,revision,updated_by:updatedBy||cloudRow.updated_by||null}
  const {data,error:recordError}=await supabase.from('mises_records').update(tombstone)
    .eq('space_id',spaceId).eq('store_name',store).eq('record_id',recordId).eq('revision',cloudRow.revision||0)
    .select('revision')
  if(recordError) throw recordError
  if(Array.isArray(data)&&data.length===0) throw new Error('Conflit de suppression distante')
  return {removedObjects}
}

/** Rejoue chaque suppression indépendamment : une panne n'empêche pas les autres purges. */
export async function processDeletionQueue(db,supabase,spaceId,remoteMap,{now=isoNow(),updatedBy=null}={}){
  const entry=await db.get('settings',DELETION_QUEUE_ID)
  const queue=entry?.queue||[]
  if(!queue.length) return {purged:0,failed:0,queue:[]}
  const remaining=[]
  let purged=0,failed=0
  for(const item of queue){
    // Fiche recréée localement depuis (restauration, import) : l'utilisateur la veut, on abandonne la purge.
    if(await db.get(item.store,item.recordId)) continue
    const cloud=remoteMap.get(keyOf(item.store,item.recordId))
    try{
      await purgeRemoteRecord(supabase,spaceId,item.store,item.recordId,cloud,{now,updatedBy})
      remoteMap.set(keyOf(item.store,item.recordId),{
        ...(cloud||{}),space_id:spaceId,store_name:item.store,record_id:item.recordId,payload:{},deleted_at:now,updated_at:now,revision:(cloud?.revision||0)+1
      })
      purged++
    }catch(error){
      remaining.push(item)
      failed++
    }
  }
  await db.put('settings',{id:DELETION_QUEUE_ID,queue:remaining,at:now})
  return {purged,failed,queue:remaining}
}

/** Une fiche locale plus récente qu'un tombstone distant est une résurrection explicite. */
export function tombstoneAction(localRow,cloudRow){
  if(!cloudRow?.deleted_at||!localRow) return 'none'
  return localTime(localRow)>cloudRow.deleted_at?'resurrect':'delete-local'
}

export const deletionKey=keyOf
