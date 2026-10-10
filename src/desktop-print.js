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
