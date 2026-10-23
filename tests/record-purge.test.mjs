import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DELETION_QUEUE_ID,
  enqueueDeletion,
  dropDeletion,
  deleteLocalRecord,
  remoteAssetPaths,
  purgeRemoteRecord,
  processDeletionQueue,
  tombstoneAction
} from '../src/record-purge.js'

const T0='2026-10-23T10:00:00.000Z'
const T1='2026-10-23T10:01:00.000Z'

function memoryDb(initial={}){
  const rows=new Map(Object.entries(initial).map(([key,value])=>[key,structuredClone(value)]))
  const calls=[]
  const key=(store,id)=>`${store}::${id}`
  return {
    calls,rows,
    async get(store,id){return structuredClone(rows.get(key(store,id)))},
    async put(store,value){calls.push(['put',store,value.id]);rows.set(key(store,value.id),structuredClone(value))},
    async delete(store,id){calls.push(['delete',store,id]);rows.delete(key(store,id))}
  }
}

function fakePurgeSupabase({storageError=false}={}){
  const calls=[]
  const assetRows=[{path:'space-1/objects/object-1/photo-a.jpg'}]
  const query=(table,operation)=>({
    select(columns){calls.push(`${table}.select:${columns}`);return query(table,'select')},
    delete(){calls.push(`${table}.delete`);return query(table,'delete')},
    update(values){calls.push({table,operation:'update',values});return query(table,'update')},
    eq(column,value){calls.push(`${table}.eq:${column}=${value}`);return query(table,operation)},
    then(resolve,reject){
      const result=table==='mises_assets'&&operation==='select'?{data:assetRows,error:null}:{data:null,error:null}
      return Promise.resolve(result).then(resolve,reject)
    }
  })
  return {
    calls,
    from(table){return query(table,'')},
    storage:{from(bucket){assert.equal(bucket,'mises-photos');return {async remove(paths){calls.push({operation:'storage.remove',paths});return storageError?{data:null,error:new Error('storage down')}:{data:paths.map(path=>({name:path})),error:null}}}}}
  }
}

test('file locale de suppressions : dédoublonnage, retrait et écriture IndexedDB', async () => {
  const first={store:'objects',recordId:'object-1',at:T0}
  assert.deepEqual(enqueueDeletion([],first),[first])
  assert.deepEqual(enqueueDeletion([first],{...first,at:T1}),[first])
  assert.deepEqual(dropDeletion([first],first),[])
  const db=memoryDb({
    'objects::object-1':{id:'object-1'},
    [`settings::${DELETION_QUEUE_ID}`]:{id:DELETION_QUEUE_ID,queue:[]}
  })
  await deleteLocalRecord(db,'objects','object-1',{now:T0})
  assert.equal(await db.get('objects','object-1'),undefined)
  assert.deepEqual((await db.get('settings',DELETION_QUEUE_ID)).queue,[first])
})

test('chemins distants : assets, photos modernes et héritées, même espace seulement', () => {
  const cloud={
    space_id:'space-1',
    payload:{
      photoAssetPath:'space-1/objects/object-1.jpg',
      photoAssetPaths:['space-1/objects/object-1/photo-a.jpg','other/objects/no.jpg'],
      photos:[{remotePath:'space-1/objects/object-1/photo-b.jpg'},{remotePath:42}]
    }
  }
  assert.deepEqual(remoteAssetPaths(cloud,[
    {path:'space-1/objects/object-1/photo-a.jpg'},
    {path:'space-1/objects/object-1/photo-c.jpg'},
    {path:'other/objects/no.jpg'}
  ]),[
    'space-1/objects/object-1/photo-a.jpg',
    'space-1/objects/object-1/photo-c.jpg',
    'space-1/objects/object-1.jpg',
    'space-1/objects/object-1/photo-b.jpg'
  ])
})

test('purge distante : Storage avant métadonnées puis tombstone sans contenu', async () => {
  const supabase=fakePurgeSupabase()
  const cloud={space_id:'space-1',store_name:'objects',record_id:'object-1',revision:4,payload:{photoAssetPath:'space-1/objects/object-1.jpg'}}
  const result=await purgeRemoteRecord(supabase,'space-1','objects','object-1',cloud,{now:T1,updatedBy:'user-1'})
  assert.equal(result.removedObjects.length,2)
  const storageAt=supabase.calls.findIndex(call=>call.operation==='storage.remove')
  const assetsAt=supabase.calls.findIndex(call=>call==='mises_assets.delete')
  const tombstoneAt=supabase.calls.findIndex(call=>call?.operation==='update')
  assert.ok(storageAt>=0&&storageAt<assetsAt&&assetsAt<tombstoneAt)
  assert.deepEqual(supabase.calls[tombstoneAt].values,{payload:{},deleted_at:T1,updated_at:T1,revision:5,updated_by:'user-1'})
})

test('échec Storage : la suppression reste dans la file locale', async () => {
  const db=memoryDb({[`settings::${DELETION_QUEUE_ID}`]:{id:DELETION_QUEUE_ID,queue:[{store:'objects',recordId:'object-1',at:T0}]}})
  const supabase=fakePurgeSupabase({storageError:true})
  const remoteMap=new Map([['objects::object-1',{space_id:'space-1',store_name:'objects',record_id:'object-1',revision:1,payload:{}}]])
  const result=await processDeletionQueue(db,supabase,'space-1',remoteMap,{now:T1,updatedBy:'user-1'})
  assert.equal(result.failed,1)
  assert.deepEqual((await db.get('settings',DELETION_QUEUE_ID)).queue,[{store:'objects',recordId:'object-1',at:T0}])
})

test('tombstone cloud : efface le cache ancien, ressuscite une modification locale plus récente', () => {
  const cloud={deleted_at:T1}
  assert.equal(tombstoneAction({id:'object-1',updatedAt:T0},cloud),'delete-local')
  assert.equal(tombstoneAction({id:'object-1',updatedAt:'2026-10-23T10:02:00.000Z'},cloud),'resurrect')
  assert.equal(tombstoneAction(null,cloud),'none')
})

test('contrat SQL : tombstone vide, assets nettoyés, purge 30 jours et RPC protégée', () => {
  const sql=readFileSync('supabase/migrations/20261023000001_mises_record_purge.sql','utf8')
  assert.match(sql,/new\.payload\s*:=\s*jsonb_build_object\('id', new\.record_id, 'labelState', 'deleted'\)/i)
  assert.match(sql,/new\.deleted_at\s*:=\s*now\(\)/i)
  assert.match(sql,/mises_tombstone_is_seed/i)
  assert.match(sql,/delete from public\.mises_assets/i)
  assert.match(sql,/interval '30 days'/i)
  assert.match(sql,/cron\.schedule\('mises-purge-tombstones'/i)
  assert.match(sql,/create or replace function public\.mises_purge_tombstones\(\)/i)
  assert.match(sql,/grant execute on function public\.mises_purge_tombstones\(\) to authenticated/i)
})

function listingSupabase({leftover=false}={}){
  const removed=[]
  const files={'space-1/objects/object-9':[{name:'photo-z.jpg',id:'f1'}],'space-1/objects':[{name:'object-9.jpg',id:'f2'},{name:'object-9',id:null}]}
  const query=()=>({select(){return query()},delete(){return query()},update(){return query()},eq(){return query()},then(r,j){return Promise.resolve({data:[],error:null}).then(r,j)}})
  return {removed,from:()=>query(),storage:{from(){return {
    async list(prefix,{search}={}){const rows=(files[prefix]||[]).filter(f=>!search||f.name.startsWith(search));return {data:leftover||!removed.length?rows:[],error:null}},
    async remove(paths){removed.push(...paths);return {data:leftover?[]:paths.map(name=>({name})),error:null}}
  }}}}
}

test('purge sans ligne cloud : fichiers du dossier Storage listés et supprimés', async () => {
  const supabase=listingSupabase()
  await purgeRemoteRecord(supabase,'space-1','objects','object-9',undefined,{now:T1})
  assert.deepEqual(supabase.removed.sort(),['space-1/objects/object-9.jpg','space-1/objects/object-9/photo-z.jpg'])
})

test('refus Storage silencieux : fichiers restants → erreur, la fiche reste en file', async () => {
  const supabase=listingSupabase({leftover:true})
  await assert.rejects(()=>purgeRemoteRecord(supabase,'space-1','objects','object-9',undefined,{now:T1}),/incomplète/)
})

test('fiche recréée localement : la purge en file est abandonnée', async () => {
  const db=memoryDb({'objects::object-1':{id:'object-1'},[`settings::${DELETION_QUEUE_ID}`]:{id:DELETION_QUEUE_ID,queue:[{store:'objects',recordId:'object-1',at:T0}]}})
  const supabase=fakePurgeSupabase()
  const result=await processDeletionQueue(db,supabase,'space-1',new Map(),{now:T1})
  assert.equal(result.purged,0)
  assert.equal(supabase.calls.length,0)
  assert.deepEqual((await db.get('settings',DELETION_QUEUE_ID)).queue,[])
})
