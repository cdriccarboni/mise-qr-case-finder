/**
 * Filename helper for exact 384px print-ready PNG labels.
 * Filename generation is purely local; never uploads inventory data.
 */
export function labelPngFileName(name='étiquette') {
  const safe=String(name||'étiquette')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')
    .slice(0,70)
  return `MISES-${safe||'etiquette'}.png`
}

export function printerDisplayState({nativeBridge=false,savedPrinterName=''}={}) {
  if (!nativeBridge) return {label:'Imprimer · Ordinateur',connected:false,mode:'system-or-png'}
  return {
    label:savedPrinterName?`Imprimante · ${savedPrinterName}`:'Imprimante · À connecter',
    connected:Boolean(savedPrinterName),mode:'android-native'
  }
}

export const MAC_PRINTER_ENDPOINT='http://127.0.0.1:39381'

/**
 * A separate macOS companion listens exclusively on loopback and talks to
 * WalkPrint/YHK via Bluetooth Classic RFCOMM. The browser cannot do that itself.
 */
export async function macPrinterHealth(fetcher=globalThis.fetch){
  try{
    const response=await fetcher(MAC_PRINTER_ENDPOINT+'/health',{
      method:'GET',mode:'cors',cache:'no-store',targetAddressSpace:'loopback',signal:AbortSignal.timeout(2000)
    })
    const result=await response.json()
    return response.ok&&result?.ready===true&&result?.backend==='mac-bluetooth'
  }catch{return false}
}

export async function sendMacThermalPrint(png,label='MISES!',fetcher=globalThis.fetch){
  if(!/^data:image\/png;base64,/.test(String(png||'')))throw Error('Étiquette PNG invalide')
  const response=await fetcher(MAC_PRINTER_ENDPOINT+'/print',{
    method:'POST',mode:'cors',cache:'no-store',targetAddressSpace:'loopback',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({png,label:String(label).slice(0,80)}),
    signal:AbortSignal.timeout(12000)
  })
  if(!response.ok)throw Error('Le compagnon Mac a refusé cette étiquette')
  const status=await response.json()
  if(status.queued!==true)throw Error('Étiquette non confirmée')
  return status
}
