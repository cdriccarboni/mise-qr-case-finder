import test from 'node:test'
import assert from 'node:assert/strict'
import { createPwaUpdateCoordinator, MISES_RECOVERY_URL } from '../src/pwa-update.js'

function fixture({remote='0.4.0-beta.19',active=true,timeoutMs=90,online=true}={}){
  const saved=new Map()
  const listeners=new Map()
  let registrations=0,updates=0,skips=0,reloads=0,progress=0,stuck=0
  const worker={
    controller:active?{name:'beta14'}:null,
    addEventListener(event,fn){listeners.set(event,fn)},
    removeEventListener(event,fn){if(listeners.get(event)===fn)listeners.delete(event)},
    async register(_url,options){
      registrations++
      assert.equal(options.updateViaCache,'none')
      return {
        active:{state:'activated'},waiting:{postMessage(){skips++}},
        async update(){updates++}
      }
    },
    activate(){listeners.get('controllerchange')?.()}
  }
  const coordinator=createPwaUpdateCoordinator({
    version:'0.4.0-beta.14',serviceWorker:worker,
    fetchVersion:async()=>({version:remote}),
    requestUpdate:()=>{},
    reload:()=>{reloads++},
    onProgress:()=>{progress++},onStuck:()=>{stuck++},
    storage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
    online:()=>online,now:()=>1000,timeoutMs
  })
  return {worker,coordinator,metrics:()=>({registrations,updates,skips,reloads,progress,stuck})}
}

test('does not reload old beta.14 until a new Service Worker controls the page',async()=>{
  const x=fixture()
  const updating=x.coordinator.check()
  await new Promise(resolve=>setTimeout(resolve,10))
  assert.equal(x.metrics().reloads,0)
  assert.equal(x.metrics().updates,1)
  assert.equal(x.metrics().skips,1)
  x.worker.activate()
  assert.equal(await updating,'reloading')
  assert.equal(x.metrics().reloads,1)
})
test('a failed activation does not loop and instead offers safe recovery',async()=>{
  const x=fixture({timeoutMs:8})
  assert.equal(await x.coordinator.check(),'stuck')
  assert.deepEqual(x.metrics(),{registrations:1,updates:1,skips:1,reloads:0,progress:1,stuck:1})
  assert.equal(await x.coordinator.check(),'stuck')
  assert.equal(x.metrics().registrations,1)
  assert.equal(x.metrics().reloads,0)
  assert.equal(x.metrics().stuck,2)
  assert.match(MISES_RECOVERY_URL,/cdriccarboni\.github\.io\/mises-pwa-recovery\//)
})
test('simultaneous background checks share one update without duplicate popups',async()=>{
  const x=fixture()
  const a=x.coordinator.check(),b=x.coordinator.check()
  await new Promise(resolve=>setTimeout(resolve,8))
  x.worker.activate()
  assert.equal(await a,'reloading')
  assert.equal(await b,'reloading')
  assert.equal(x.metrics().registrations,1)
  assert.equal(x.metrics().progress,1)
})
test('an up-to-date client does not alter worker or local inventory',async()=>{
  const x=fixture({remote:'0.4.0-beta.14'})
  assert.equal(await x.coordinator.check(),'current')
  assert.equal(x.metrics().registrations,0)
})
test('offline state never triggers a reload or a repair',async()=>{
  const x=fixture({online:false})
  assert.equal(await x.coordinator.check(),'offline')
  assert.equal(x.metrics().registrations,0)
})
