import test from 'node:test'
import assert from 'node:assert/strict'
import { stableId, ensureStableId, textDigest } from '../src/ids.js'
import { entityUrl, readEntityUrl, resolveEntityId, shortId } from '../src/qr-link.js'
test('nouvel ID = UUID préfixé, ID existant conservé', () => {
  assert.match(stableId('case'), /^case-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.equal(ensureStableId({ id: 'ancien-1' }).id, 'ancien-1')
  assert.notEqual(ensureStableId({}).id, ensureStableId({}).id)
})
test('digest déterministe', () => { assert.equal(textDigest('a|b'), textDigest('a|b')); assert.notEqual(textDigest('a'), textDigest('b')) })
test('QR porte l\'ID complet et se relit', () => {
  const id = 'case-0f8c2b1e-1111-4222-8333-abcdefabcdef'
  const url = entityUrl('https://x.test/app/#h', 'case', id)
  assert.equal(url, `https://x.test/app/?case=${id}`)
  assert.equal(readEntityUrl(url).caseId, id)
})
test('ancien ID court résolu seulement si non ambigu', () => {
  const list = [{ id: 'case-aaa-111111' }, { id: 'case-bbb-222222' }, { id: 'case-ccc-x22222' }]
  assert.equal(resolveEntityId('case-aaa-111111', list).id, 'case-aaa-111111')
  assert.equal(resolveEntityId(shortId('case-aaa-111111'), list).id, 'case-aaa-111111')
  assert.equal(resolveEntityId('222222', list).id, 'case-bbb-222222')
  assert.equal(resolveEntityId('22222', list), null)
  assert.equal(resolveEntityId('zzzzzz', list), null)
})
