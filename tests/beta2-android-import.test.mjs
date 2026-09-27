import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import 'fake-indexeddb/auto'
import { openDB, deleteDB } from 'idb'
import { readData } from '../src/data-bruitage.js'
import { applyBackup } from '../src/backup.js'
import { DB_NAME, DB_VERSION, LEGACY_DB_NAME, createStores } from '../src/storage.js'

const backup = JSON.parse(readFileSync(new URL('./fixtures/beta2-backup.json', import.meta.url), 'utf8'))

test('a complete beta.2 export refills the new app, which cannot see the old phone database', async () => {
  await deleteDB(LEGACY_DB_NAME)
  await deleteDB(DB_NAME)

  const oldPhone = await openDB(LEGACY_DB_NAME, DB_VERSION, { upgrade: createStores })
  for (const [store, rows] of Object.entries(backup)) {
    if (!Array.isArray(rows) || !oldPhone.objectStoreNames.contains(store)) continue
    for (const row of rows) await oldPhone.put(store, row)
  }
  await oldPhone.put('objects', { id: 'obj-only-old-phone', name: 'Reste sur l’ancienne appli', hear: 'secret', imagine: '' })
  oldPhone.close()

  const fresh = await openDB(DB_NAME, DB_VERSION, { upgrade: createStores })
  await fresh.put('settings', { id: 'ink', hex: '#D12A74' })
  await fresh.put('settings', { id: 'seeded-v3', at: '2026-09-27T18:00:00.000Z' })
  assert.equal(await fresh.get('objects', 'obj-beta2'), undefined)
  fresh.close()

  const installed = await openDB(DB_NAME, DB_VERSION)
  await applyBackup(installed, backup)
  installed.close()

  const reopened = await openDB(DB_NAME, DB_VERSION)
  const data = await readData(reopened)
  const object = data.objects.find(item => item.id === 'obj-beta2')
  assert.equal(object.name, 'Gourde froissable')
  assert.equal(object.hear, 'glouglou')
  assert.equal(object.imagine, 'cascade fictive')
  assert.equal(object.photo, 'data:image/png;base64,iVBORw0KGgo=')
  assert.equal(object.audioMemo, 'data:audio/webm;base64,AAAA')
  assert.equal(object.caseId, 'case-beta2')
  assert.equal(data.cases.find(item => item.id === 'case-beta2').name, 'Caisse grise n°23')
  assert.equal(data.sounds.find(item => item.id === 'sound-beta2').name, 'Glouglou enregistré')
  assert.equal(data.objectSounds.find(item => item.id === 'link-beta2').soundId, 'sound-beta2')
  assert.equal(data.aliases.find(item => item.id === 'alias-beta2').label, 'gourde')
  assert.deepEqual(data.mises.find(item => item.id === 'mise-beta2').checked, ['obj-beta2'])
  assert.equal(data.sources.find(item => item.id === 'source-beta2').name, 'Carnet beta.2')
  assert.equal(data.review.find(item => item.id === 'review-beta2').status, 'pending')
  assert.equal(data.corrections.find(item => item.id === 'corr-beta2').humanValidated, true)
  assert.equal((await reopened.get('kits', 'kit-beta2')).name, 'Kit tournée')
  assert.equal((await reopened.get('learnings', 'learn-beta2')).active, true)
  assert.equal(await reopened.get('objects', 'obj-only-old-phone'), undefined)
  assert.equal((await reopened.get('settings', 'ink')).hex, '#D12A74')
  assert.equal((await reopened.get('settings', 'seeded-v3')).at, '2026-09-27T18:00:00.000Z')
  reopened.close()

  const stillOld = await openDB(LEGACY_DB_NAME)
  assert.equal((await stillOld.get('objects', 'obj-only-old-phone')).hear, 'secret')
  assert.equal((await stillOld.get('objects', 'obj-beta2')).hear, 'glouglou')
  stillOld.close()

  await deleteDB(LEGACY_DB_NAME)
  await deleteDB(DB_NAME)
})
