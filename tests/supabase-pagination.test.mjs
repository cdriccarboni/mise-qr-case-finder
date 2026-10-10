import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchAllRemoteRecords } from '../src/sync-core.js'

function fakeSupabase(rows,{failureAt=-1}={}){
  const calls=[]
  return {
    calls,
    from(table){
      assert.equal(table,'mises_records')
      return {
        select(){return this},
        eq(column,value){assert.equal(column,'space_id');assert.equal(value,'my-space');return this},
        order(column){assert.ok(['store_name','record_id'].includes(column));return this},
        async range(start,end){
          calls.push([start,end])
          if(start===failureAt)return {data:null,error:new Error('Cloud unavailable')}
          return {data:rows.slice(start,end+1),error:null}
        }
      }
    }
  }
}

test('no record is lost across Supabase 1,000-row boundary',async()=>{
  for(const total of [0,1,499,500,999,1000,1001,2503]){
    const rows=Array.from({length:total},(_,i)=>({store_name:'objects',record_id:`object-${String(i).padStart(5,'0')}`}))
    const mock=fakeSupabase(rows)
    const out=await fetchAllRemoteRecords(mock,'my-space')
    assert.equal(out.length,total)
    assert.equal(new Set(out.map(row=>row.record_id)).size,total)
    assert.deepEqual(mock.calls.map(([start])=>start),Array.from({length:Math.floor(total/500)+1},(_,i)=>i*500).slice(0,mock.calls.length))
  }
})

test('a failed page fails the entire sync rather than pretending the cloud is empty',async()=>{
  const remote=Array.from({length:1001},(_,i)=>({record_id:String(i)}))
  const mock=fakeSupabase(remote,{failureAt:500})
  await assert.rejects(fetchAllRemoteRecords(mock,'my-space'),/Cloud unavailable/)
  assert.deepEqual(mock.calls,[[0,499],[500,999]])
})

test('page boundaries and page size are checked',async()=>{
  const mock=fakeSupabase([{record_id:'x'}])
  await assert.rejects(fetchAllRemoteRecords(mock,'my-space',{pageSize:1001}),RangeError)
  assert.equal((await fetchAllRemoteRecords(mock,'my-space',{pageSize:1})).length,1)
})
