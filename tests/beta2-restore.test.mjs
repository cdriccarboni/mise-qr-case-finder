import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { DATA_STORES, readData } from '../src/data-bruitage.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('records saved like beta.2 are still found, and storage keys stay the same', async () => {
  const main = read('../src/main.js')
  const gradle = read('../android/app/build.gradle.kts')
  const sync = read('../src/google-sync.js')
  assert.match(main, /openDB\('mise-db',5/)
  assert.match(main, /const DISPLAY_KEY='mise-display-mode',THEME_KEY='mise-theme-mode',INK_KEY='mise-ink'/)
  assert.match(main, /download='MISE-backup\.json'/)
  assert.match(gradle, /applicationId = "fr\.acousmatictheatre\.mise"/)
  assert.match(sync, /const STATE_NAME='mise-data\.json'/)
  assert.match(sync, /name = 'MISE !'/)

  const payload = {
    version: 3,
    objects: [{ id: 'obj-beta2', name: 'Gourde froissable', hear: 'glouglou', imagine: 'cascade fictive', aliases: [], tags: [], sounds: [], caseId: 'case-beta2' }],
    cases: [{ id: 'case-beta2', name: 'Caisse grise n°23' }],
    mises: [{ id: 'mise-beta2', name: 'Mise du soir', objectIds: ['obj-beta2'], checked: ['obj-beta2'] }],
    kits: [{ id: 'kit-beta2', name: 'Kit tournée', objectIds: ['obj-beta2'] }],
    learnings: [{ id: 'learn-beta2', kind: 'label-preference', label: 'bottle', objectId: 'obj-beta2', active: true, createdAt: '2026-09-27T12:00:00.000Z' }],
    corrections: [{ id: 'corr-beta2', label: 'bottle', context: 'atelier', action: 'match', objectId: 'obj-beta2', humanValidated: true }]
  }
  const opened = await openDB('mise-db', 5, { upgrade(db) {
    for (const key of [...DATA_STORES, 'kits', 'settings', 'learnings']) {
      if (!db.objectStoreNames.contains(key)) db.createObjectStore(key, { keyPath: 'id' })
    }
  } })
  await opened.put('settings', { id: 'ink', hex: '#1D4E89' })
  for (const key of ['objects', 'cases', 'mises', 'kits', 'learnings', 'corrections']) {
    for (const item of payload[key]) await opened.put(key, item)
  }
  opened.close()

  const again = await openDB('mise-db', 5)
  const data = await readData(again)
  assert.equal(data.objects.find(item => item.id === 'obj-beta2').hear, 'glouglou')
  assert.equal(data.objects.find(item => item.id === 'obj-beta2').imagine, 'cascade fictive')
  assert.equal(data.cases.find(item => item.id === 'case-beta2').name, 'Caisse grise n°23')
  assert.deepEqual(data.mises.find(item => item.id === 'mise-beta2').checked, ['obj-beta2'])
  assert.equal(data.corrections.find(item => item.id === 'corr-beta2').objectId, 'obj-beta2')
  assert.equal((await again.get('kits', 'kit-beta2')).name, 'Kit tournée')
  assert.equal((await again.get('learnings', 'learn-beta2')).active, true)
  if (!Array.isArray(payload.settings)) {
    assert.equal((await again.get('settings', 'ink')).hex, '#1D4E89')
  }
  again.close()
})
