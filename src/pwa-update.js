// Automatic PWA update coordinator. No IndexedDB/localStorage/cache deletion here.
// A safe same-origin recovery page is used only if the worker cannot take control.
export const MISES_RECOVERY_URL='https://cdriccarboni.github.io/mises-pwa-recovery/'

export function createPwaUpdateCoordinator({
  version,
  serviceWorker,
  fetchVersion,
  requestUpdate=()=>{},
  reload,
  onProgress=()=>{},
  onStuck=()=>{},
  storage,
  online=()=>true,
  now=()=>Date.now(),
  timeoutMs=30000,
  scopeUrl='https://cdriccarboni.github.io/mise-qr-case-finder/'
}={}){
  let pending=null
  let checking=null
  const getKey=remote=>'mises-pwa-refresh:'+version+':'+remote

  async function checkInternal(){
    if(pending || !online())return pending||'offline'
    let remote
    try{
      remote=String((await fetchVersion())?.version||'').trim()
    }catch{return 'version-unavailable'}
    if(!remote || remote===version)return 'current'
    const key=getKey(remote)
    let lastAttempt=0
    try{lastAttempt=Number(storage?.getItem(key)||0)}catch{}
    if(lastAttempt>0 && now()-lastAttempt<5*60_000){
      onStuck(remote)
      return 'stuck'
    }
    if(!serviceWorker?.register){
      onStuck(remote)
      return 'service-worker-unavailable'
    }
    pending=(async()=>{
      // Mark before handing control to the Vite updater, which may reload the page itself.
      // If a stale shell comes back after this reload, show recovery instead of looping.
      try{storage?.setItem(key,String(now()))}catch{}
      onProgress(remote)
      const originalController=serviceWorker.controller
      let onChange
      let timeout
      try{
        const changed=new Promise(resolve=>{
          onChange=()=>resolve(true)
          serviceWorker.addEventListener('controllerchange',onChange)
        })
        const timed=new Promise(resolve=>{timeout=setTimeout(()=>resolve(false),timeoutMs)})
        const registration=await serviceWorker.register(new URL('sw.js',scopeUrl).href,{
          scope:scopeUrl,updateViaCache:'none'
        })
        await registration.update()
        if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'})
        // Vite PWA can apply a waiting worker automatically.
        try{Promise.resolve(requestUpdate(true)).catch(()=>{})}catch{}
        // Only reload once a new worker controls this page, never on an arbitrary timer.
        const activated=await Promise.race([changed,timed])
        if(activated || (!originalController && registration.active?.state==='activated')){
          reload()
          return 'reloading'
        }
        onStuck(remote)
        return 'stuck'
      }catch{
        onStuck(remote)
        return 'failed'
      }finally{
        if(timeout)clearTimeout(timeout)
        if(onChange)serviceWorker.removeEventListener('controllerchange',onChange)
      }
    })()
    try{return await pending}finally{pending=null}
  }
  function check(){
    if(pending)return pending
    if(checking)return checking
    checking=checkInternal().finally(()=>{checking=null})
    return checking
  }
  return {check}
}
