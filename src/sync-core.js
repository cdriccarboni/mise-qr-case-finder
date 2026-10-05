import { DATA_STORES } from './data-bruitage.js'
import { isOwnerPrivateAccount } from './owner-private.js'
import { supabaseClient, supabaseSession } from './supabase-client.js'

const BUCKET='mises-photos'
const SYNC_STORES=[...DATA_STORES,'kits','learnings'].filter(name=>name!=='settings')
const photoField='photo'

const isoNow=()=>new Date().toISOString()
const localTime=row=>row?.updatedAt||row?.createdAt||'1970-01-01T00:00:00.000Z'
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
async function uploadPhoto(supabase,spaceId,store,row){
  const parsed=dataUrlParts(row?.[photoField])
  if(!parsed) return null
  const path=remotePath(spaceId,store,row.id)
  const blob=await dataUrlBlob(row[photoField])
  const {error}=await supabase.storage.from(BUCKET).upload(path,blob,{
    upsert:true,contentType:parsed.mime,cacheControl:'31536000'
  })
  if(error) throw error
  const {error:assetError}=await supabase.from('mises_assets').upsert({
    space_id:spaceId,store_name:store,record_id:row.id,path,mime_type:parsed.mime,bytes:blob.size,created_by:(await supabaseSession()).user.id,updated_at:isoNow()
  },{onConflict:'path'})
  if(assetError) throw assetError
  return path
}
async function preparePayload(supabase,spaceId,store,row){
  const payload=clone(row)
  if(payload.photo){
    const photoAssetPath=await uploadPhoto(supabase,spaceId,store,row)
    if(photoAssetPath){
      delete payload.photo
      payload.photoAssetPath=photoAssetPath
    }
  }
  return payload
}
async function hydratePhoto(supabase,payload){
  if(!payload?.photoAssetPath||payload.photo) return payload
  const {data,error}=await supabase.storage.from(BUCKET).download(payload.photoAssetPath)
  if(error) throw error
  const next=clone(payload)
  next.photo=await blobDataUrl(data)
  return next
}
export async function syncMises(db,{onProgress=()=>{}}={}){
  const session=await supabaseSession()
  if(!session?.user) return {ok:false,reason:'not-authenticated',pushed:0,pulled:0,photos:0}
  const supabase=await supabaseClient()
  const spaceId=await ensurePersonalSpace(supabase,session.user)
  const {data:remote,error:remoteError}=await supabase.from('mises_records').select('space_id,store_name,record_id,payload,updated_by,updated_at,deleted_at').eq('space_id',spaceId)
  if(remoteError) throw remoteError
  const remoteMap=new Map((remote||[]).map(r=>[`${r.store_name}::${r.record_id}`,r]))
  let pushed=0,pulled=0,photos=0
  const total=SYNC_STORES.reduce((n,s)=>n+1+n,0)
  let step=0
  for(const store of SYNC_STORES){
    const localRows=await db.getAll(store)
    for(const row of localRows){
      if(!shouldSync(store,row,session)) continue
      const key=`${store}::${row.id}`
      const cloud=remoteMap.get(key)
      const lt=localTime(row)
      const rt=cloud?.updated_at||'1970-01-01T00:00:00.000Z'
      if(!cloud || lt>rt){
        const payload=await preparePayload(supabase,spaceId,store,row)
        const {error}=await supabase.from('mises_records').upsert({
          space_id:spaceId,store_name:store,record_id:row.id,payload,updated_by:session.user.id,updated_at:lt,revision:(cloud?.revision||0)+1
        },{onConflict:'space_id,store_name,record_id'})
        if(error) throw error
        pushed++
        if(payload.photoAssetPath) photos++
      }else if(rt>lt){
        const payload=await hydratePhoto(supabase,cloud.payload)
        await db.put(store,payload)
        pulled++
        if(payload.photoAssetPath) photos++
      }
      step++;onProgress({step,total,pushed,pulled,photos})
    }
  }
  await db.put('settings',{id:'supabase-sync',spaceId,at:isoNow(),pushed,pulled,photos,status:'ok'})
  return {ok:true,spaceId,pushed,pulled,photos}
}
