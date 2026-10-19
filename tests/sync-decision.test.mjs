import test from 'node:test'
import assert from 'node:assert/strict'
import { decideSync, appendConflicts, conflictEntry, stripSyncMeta } from '../src/sync-decision.js'
const at = s => `2026-10-19T10:00:0${s}.000Z`
test('nouvelle fiche -> push ; fiche distante absente localement -> pull', () => {
  assert.equal(decideSync({ id: 'a', updatedAt: at(1) }, null).action, 'push')
  assert.equal(decideSync(null, { revision: 2 }).action, 'pull')
})
test('révision serveur > base et modif locale -> conflit, pas d\'écrasement', () => {
  const local = { id: 'a', _syncRevision: 2, _syncedAt: at(1), updatedAt: at(5) }
  assert.equal(decideSync(local, { revision: 3, updated_at: at(2) }).action, 'conflict')
})
test('révision serveur > base sans modif locale -> pull ; égale + modif -> push', () => {
  assert.equal(decideSync({ id: 'a', _syncRevision: 2, _syncedAt: at(5), updatedAt: at(1) }, { revision: 3, updated_at: at(9) }).action, 'pull')
  assert.equal(decideSync({ id: 'a', _syncRevision: 3, _syncedAt: at(1), updatedAt: at(5) }, { revision: 3 }).action, 'push')
  assert.equal(decideSync({ id: 'a', _syncRevision: 3, _syncedAt: at(5), updatedAt: at(1) }, { revision: 3 }).action, 'none')
})
test('héritage sans base : règle temporelle', () => {
  assert.equal(decideSync({ id: 'a', updatedAt: at(5) }, { revision: 1, updated_at: at(1) }).action, 'push')
  assert.equal(decideSync({ id: 'a', updatedAt: at(1) }, { revision: 1, updated_at: at(5) }).action, 'pull')
})
test('journal des conflits dédoublonné et borné ; méta retirée du payload', () => {
  const e = conflictEntry('objects', { id: 'a', _syncRevision: 1 }, { revision: 2, payload: { id: 'a' } })
  assert.equal(appendConflicts(appendConflicts([], [e]), [e]).length, 1)
  assert.deepEqual(stripSyncMeta({ id: 'a', _syncRevision: 1, _syncedAt: 'x' }), { id: 'a' })
})
