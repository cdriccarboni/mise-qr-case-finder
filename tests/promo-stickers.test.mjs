import test from 'node:test'
import assert from 'node:assert/strict'
import { PROMO_STICKERS, getPromoSticker, promoTransferCode, parsePromoTransferCode } from '../src/promo-stickers.js'

test('three QR stickers point to public websites and never Android-local URLs',()=>{
  assert.deepEqual(PROMO_STICKERS.map(x=>x.id),['mises','art','acousmatic'])
  assert.deepEqual(PROMO_STICKERS.map(x=>x.url),[
    'https://cdriccarboni.github.io/mise-qr-case-finder/',
    'https://art.acousmatic-theatre.fr/',
    'https://www.acousmatic-theatre.fr/'
  ])
  for(const x of PROMO_STICKERS){
    assert.ok(x.label&&x.printTitle&&x.fileName)
    assert.ok(x.url.startsWith('https://'))
    assert.ok(!x.url.includes('appassets.androidplatform.net'))
  }
})

test('desktop-to-Android QR transfers only a known sticker template',()=>{
  for(const item of PROMO_STICKERS){
    const token=promoTransferCode(item.id)
    assert.equal(parsePromoTransferCode(token)?.id,item.id)
  }
  assert.equal(parsePromoTransferCode('https://example.net/evil'),null)
  assert.equal(parsePromoTransferCode('MISES:PRINT-PROMO:1:../../'),null)
  assert.equal(parsePromoTransferCode('MISES:PRINT-PROMO:99:art'),null)
  assert.throws(()=>promoTransferCode('arbitrary-url'),RangeError)
  assert.equal(getPromoSticker('not-known').id,'mises')
})
