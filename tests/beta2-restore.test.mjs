import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import 'fake-indexeddb/auto'
import { openDB, deleteDB } from 'idb'
import * as XLSX from 'xlsx'
import { readData } from '../src/data-bruitage.js'
import { parseImportFile, workbookToData } from '../src/data-import.js'
import {
  ALL_STORES, DB_NAME, DB_VERSION, KEY_MIGRATIONS, LEGACY_DB_NAME,
  LEGACY_LOCAL_KEYS, LEGACY_PROJECT_PREFIX, LEGACY_SESSION_TOKEN_KEY,
  LOCAL_KEYS, PROJECT_PREFIX, SESSION_TOKEN_KEY,
  createStores, migrateDatabase, migrateLocalKeys, migrateSessionKeys
} from '../src/storage.js'
import { DRIVE_FOLDER_NAME, DRIVE_STATE_NAME, LEGACY_DRIVE_FOLDER_NAME, LEGACY_DRIVE_STATE_NAME } from '../src/google-sync.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: key => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value) },
    key: index => Object.keys(data)[index] ?? null,
    get length() { return Object.keys(data).length },
    snapshot: () => ({ ...data })
  }
}

test('beta.2 data is copied into the MISES keys, kept, and still there after a restart', async () => {
  const main = read('../src/main.js')
  const gradle = read('../android/app/build.gradle.kts')
  assert.match(main, /migrateDatabase\(\)/)
  assert.match(main, /openDB\(DB_NAME,DB_VERSION/)
  assert.match(main, /download='MISES-backup\.json'/)
  assert.match(gradle, /val playApplicationId = "fr\.acousmatictheatre\.mise"/)
  assert.match(gradle, /applicationId = playApplicationId/)
  assert.equal(DRIVE_FOLDER_NAME, 'MISES !')
  assert.equal(LEGACY_DRIVE_FOLDER_NAME, 'MISE !')
  assert.equal(DRIVE_STATE_NAME, 'mises-data.json')
  assert.equal(LEGACY_DRIVE_STATE_NAME, 'mise-data.json')
  assert.deepEqual(KEY_MIGRATIONS.map(item => item.from), [
    'mise-display-mode',
    'mise-theme-mode',
    'mise-ink',
    'mise-google-oauth-client-id',
    'art-mise-project-v1:*',
    'mise-google-oauth-session-v1',
    'mise-db'
  ])

  await deleteDB(LEGACY_DB_NAME)
  await deleteDB(DB_NAME)
  const legacy = await openDB(LEGACY_DB_NAME, DB_VERSION, { upgrade: createStores })
  const records = {
    objects: [{ id: 'obj-beta2', name: 'Gourde froissable', hear: 'glouglou', imagine: 'cascade fictive', aliases: [], tags: [], sounds: [], caseId: 'case-beta2' }],
    cases: [{ id: 'case-beta2', name: 'Caisse grise n°23' }],
    mises: [{ id: 'mise-beta2', name: 'Mise du soir', objectIds: ['obj-beta2'], checked: ['obj-beta2'] }],
    kits: [{ id: 'kit-beta2', name: 'Kit tournée', objectIds: ['obj-beta2'] }],
    learnings: [{ id: 'learn-beta2', kind: 'label-preference', label: 'bottle', objectId: 'obj-beta2', active: true, createdAt: '2026-09-27T12:00:00.000Z' }],
    corrections: [{ id: 'corr-beta2', label: 'bottle', context: 'atelier', action: 'match', objectId: 'obj-beta2', humanValidated: true }],
    settings: [{ id: 'google-account', email: 'beta2@example.com' }, { id: 'ink', hex: '#1D4E89' }]
  }
  for (const [store, rows] of Object.entries(records)) {
    for (const row of rows) await legacy.put(store, row)
  }
  legacy.close()

  const local = memoryStorage({
    [LEGACY_LOCAL_KEYS.display]: 'mobile',
    [LEGACY_LOCAL_KEYS.theme]: 'dark',
    [LEGACY_LOCAL_KEYS.ink]: '#1D4E89',
    [LEGACY_LOCAL_KEYS.googleClientId]: '23465779049-test.apps.googleusercontent.com',
    [`${LEGACY_PROJECT_PREFIX}show-beta2`]: '{"miseId":"mise-beta2"}',
    'art-company-root-v1': '{"keep":true}'
  })
  const session = memoryStorage({
    [LEGACY_SESSION_TOKEN_KEY]: '{"token":"beta2-token","expiresAt":9999999999999,"scope":"openid email profile https://www.googleapis.com/auth/drive"}'
  })
  assert.equal(migrateLocalKeys(local), 5)
  assert.equal(migrateSessionKeys(session), 1)
  assert.equal(await migrateDatabase(), 8)

  const migrated = await openDB(DB_NAME, DB_VERSION)
  const data = await readData(migrated)
  assert.equal(data.objects.find(item => item.id === 'obj-beta2').hear, 'glouglou')
  assert.equal(data.objects.find(item => item.id === 'obj-beta2').imagine, 'cascade fictive')
  assert.equal(data.cases.find(item => item.id === 'case-beta2').name, 'Caisse grise n°23')
  assert.deepEqual(data.mises.find(item => item.id === 'mise-beta2').checked, ['obj-beta2'])
  assert.equal(data.corrections.find(item => item.id === 'corr-beta2').objectId, 'obj-beta2')
  assert.equal((await migrated.get('kits', 'kit-beta2')).name, 'Kit tournée')
  assert.equal((await migrated.get('learnings', 'learn-beta2')).active, true)
  assert.equal((await migrated.get('settings', 'google-account')).email, 'beta2@example.com')
  assert.equal(local.getItem(LOCAL_KEYS.display), 'mobile')
  assert.equal(local.getItem(LOCAL_KEYS.theme), 'dark')
  assert.equal(local.getItem(LOCAL_KEYS.ink), '#1D4E89')
  assert.equal(local.getItem(LOCAL_KEYS.googleClientId), '23465779049-test.apps.googleusercontent.com')
  assert.equal(local.getItem(`${PROJECT_PREFIX}show-beta2`), '{"miseId":"mise-beta2"}')
  assert.equal(local.getItem(`${LEGACY_PROJECT_PREFIX}show-beta2`), '{"miseId":"mise-beta2"}')
  assert.equal(local.getItem('art-company-root-v1'), '{"keep":true}')
  assert.equal(local.getItem(LEGACY_LOCAL_KEYS.theme), 'dark')
  assert.equal(session.getItem(SESSION_TOKEN_KEY), session.getItem(LEGACY_SESSION_TOKEN_KEY))

  await migrated.put('objects', { ...data.objects.find(item => item.id === 'obj-beta2'), name: 'Nom déjà repris' })
  local.setItem(LOCAL_KEYS.theme, 'regie')
  migrated.close()
  assert.equal(migrateLocalKeys(local), 0)
  assert.equal(migrateSessionKeys(session), 0)
  assert.equal(await migrateDatabase(), 0)
  assert.equal(local.getItem(LOCAL_KEYS.theme), 'regie')
  assert.equal(local.getItem(LEGACY_LOCAL_KEYS.theme), 'dark')

  const restarted = await openDB(DB_NAME, DB_VERSION)
  const again = await readData(restarted)
  assert.equal(again.objects.find(item => item.id === 'obj-beta2').name, 'Nom déjà repris')
  assert.equal(again.objects.find(item => item.id === 'obj-beta2').hear, 'glouglou')
  restarted.close()
  const stillLegacy = await openDB(LEGACY_DB_NAME)
  assert.equal((await stillLegacy.get('objects', 'obj-beta2')).name, 'Gourde froissable')
  assert.equal(stillLegacy.objectStoreNames.contains('objects'), true)
  stillLegacy.close()
  assert.equal(ALL_STORES.includes('learnings'), true)

  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['MISE-Data-Bruitage-v1']]), '_MISE')
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([{ id: 'obj-old-export', name: 'Gourde froissable', hear: 'glouglou', imagine: 'cascade fictive' }]), 'Objets')
  const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' })
  const imported = workbookToData(bytes, 'source-beta2')
  assert.equal(imported.canonical, true)
  assert.equal(imported.data.objects[0].imagine, 'cascade fictive')
  const json = new File([JSON.stringify({ schema: 'MISE-Data-Bruitage-v1', objects: [{ id: 'obj-json-old', name: 'Ancien export', hear: 'toc', imagine: 'tac' }] })], 'MISE-Data-Bruitage.json', { type: 'application/json' })
  const fromJson = await parseImportFile(json)
  assert.equal(fromJson.objects.find(item => item.id === 'obj-json-old').hear, 'toc')

  await deleteDB(LEGACY_DB_NAME)
  await deleteDB(DB_NAME)
})
