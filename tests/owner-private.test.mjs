import test from 'node:test'
import assert from 'node:assert/strict'
import { OWNER_PRIVATE_EMAIL, isOwnerPrivateAccount, assertOwnerPrivateSync } from '../src/owner-private.js'
import { consultationRowsToObjects } from '../src/data-import.js'

test('owner private email is locked to Cédric', () => {
  assert.equal(OWNER_PRIVATE_EMAIL, 'cdric.carboni@gmail.com')
  assert.equal(isOwnerPrivateAccount('cdric.carboni@gmail.com'), true)
  assert.equal(isOwnerPrivateAccount('CDRIC.CARBONI@GMAIL.COM'), true)
  assert.equal(isOwnerPrivateAccount('autre@example.com'), false)
  assert.throws(() => assertOwnerPrivateSync({ user: { email: 'autre@example.com' } }), /réservé/)
  assert.equal(assertOwnerPrivateSync({ user: { email: 'cdric.carboni@gmail.com' } }), true)
})

test('consultation import keeps only private rows for personal stock', () => {
  const rows = [
    { son: 'Feu public', objets: 'papier', technique: 'web', publication_scope: 'PUBLIC_WEB', relation_id: 'REL-PUB' },
    { son: 'Feu privé', objets: 'bougie', technique: 'doc perso', publication_scope: 'PRIVE_ONLY', relation_id: 'REL-PRIV' },
    { son: 'Mixte', objets: 'eau', technique: 'mix', publication_scope: 'MIXTE', relation_id: 'REL-MIX' }
  ]
  const objects = consultationRowsToObjects(rows, 'test')
  assert.equal(objects.length, 2)
  assert.ok(objects.every(o => o.publicationScope !== 'PUBLIC_WEB'))
  assert.ok(objects.some(o => o.name === 'Feu privé'))
  assert.ok(objects.some(o => o.name === 'Mixte'))
})
