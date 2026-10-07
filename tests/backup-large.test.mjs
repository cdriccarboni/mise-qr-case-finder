import test from 'node:test'
import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { openDB, deleteDB } from 'idb'
import { applyBackup, backupItemCount } from '../src/backup.js'
import { createStores, DB_VERSION } from '../src/storage.js'

const DB = 'mises-large-backup-test'

async function freshDb() {
  await deleteDB(DB)
  return openDB(DB, DB_VERSION, { upgrade: createStores })
}

test('restore keeps every item beyond 999 and reports duplicates/invalid rows', async () => {
  const db = await freshDb()
  const objects = Array.from({ length: 1505 }, (_, index) => ({
    id: `obj-${index + 1}`,
    name: `Objet ${index + 1}`
  }))
  objects.push({ id: 'obj-1000', name: 'Objet 1000 · dernière version' })
  objects.push({ id: '', name: 'Sans identifiant' })
  const payload = {
    objects,
    cases: [{ id: 'case-main', name: 'Caisse principale' }],
    settings: [{ id: 'display', value: 'mobile' }]
  }

  const progress = []
  assert.equal(backupItemCount(payload), 1509)
  const report = await applyBackup(db, payload, { onProgress: state => progress.push([state.processed, state.total]) })

  assert.equal(report.verified, true)
  assert.equal(report.totalIncoming, 1509)
  assert.equal(report.imported, 1507)
  assert.equal(report.duplicates, 1)
  assert.equal(report.invalid, 1)
  assert.equal(await db.count('objects'), 1505)
  assert.equal((await db.get('objects', 'obj-1000')).name, 'Objet 1000 · dernière version')
  assert.deepEqual(progress.at(-1), [1509, 1509])

  db.close()
  await deleteDB(DB)
})

test('restore rolls every store back when one write fails', async () => {
  const db = await freshDb()
  await db.put('objects', { id: 'existing', name: 'À conserver' })
  await db.put('cases', { id: 'existing-case', name: 'Caisse à conserver' })

  await assert.rejects(
    () => applyBackup(db, {
      objects: [
        { id: 'new-object', name: 'Nouveau' },
        { id: 'broken-object', name: 'Impossible à cloner', bad: () => true }
      ],
      cases: [{ id: 'new-case', name: 'Nouvelle caisse' }]
    })
  )

  assert.equal((await db.get('objects', 'existing')).name, 'À conserver')
  assert.equal(await db.get('objects', 'new-object'), undefined)
  assert.equal((await db.get('cases', 'existing-case')).name, 'Caisse à conserver')
  assert.equal(await db.get('cases', 'new-case'), undefined)

  db.close()
  await deleteDB(DB)
})
