
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