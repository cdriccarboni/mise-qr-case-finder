/**
 * Public destinations for small QR stickers printed with MISES!.
 * Keep separate from inventory entity URLs and Android's appassets origin.
 */
export const PROMO_STICKERS=Object.freeze([
  Object.freeze({
    id:'mises',
    label:'MISES !',
    printTitle:'MISES!',
    subtitle:'Decouvre MISES!',
    url:'https://cdriccarboni.github.io/mise-qr-case-finder/',
    fileName:'MISES'
  }),
  Object.freeze({
    id:'art',
    label:'ART · Acousmatic Régie Tools',
    printTitle:'ART',
    subtitle:'Acousmatic Regie Tools',
    url:'https://art.acousmatic-theatre.fr/',
    fileName:'ART-Regie-Tools'
  }),
  Object.freeze({
    id:'acousmatic',
    label:'Acousmatic Théâtre',
    printTitle:'ACOUSMATIC THEATRE',
    subtitle:'Theatre sonore et plastique',
    url:'https://www.acousmatic-theatre.fr/',
    fileName:'Acousmatic-Theatre'
  })
])
export function getPromoSticker(id='mises'){
  return PROMO_STICKERS.find(item=>item.id===id)||PROMO_STICKERS[0]
}

/**
 * Local handoff QR for MISES's own scanner, not a web URL.
 * Only three predefined public sticker IDs are accepted (no arbitrary URL,
 * JSON or remote code), and scanning never sends an automatic print job.
 */
export function promoTransferCode(id='mises'){
  const target=PROMO_STICKERS.find(item=>item.id===id)
  if(!target)throw new RangeError('Sticker QR inconnu')
  return 'MISES:PRINT-PROMO:1:'+target.id
}
export function parsePromoTransferCode(raw){
  const match=/^MISES:PRINT-PROMO:1:(mises|art|acousmatic)$/.exec(String(raw||'').trim())
  return match?getPromoSticker(match[1]):null
}
