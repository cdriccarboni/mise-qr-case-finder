import { openDB } from 'idb'
import { DATA_STORES } from './data-bruitage.js'

/** Base IndexedDB de l’appli. L’ancienne base reste sur l’appareil. */
export const DB_NAME = 'mises-db'
export const LEGACY_DB_NAME = 'mise-db'
export const DB_VERSION = 5

export const EXTRA_STORES = ['kits', 'settings', 'learnings']
export const ALL_STORES = [...DATA_STORES, ...EXTRA_STORES]

export const LOCAL_KEYS = {
  display: 'mises-display-mode',
  theme: 'mises-theme-mode',
  ink: 'mises-ink',
  googleClientId: 'mises-google-oauth-client-id'
}
export const LEGACY_LOCAL_KEYS = {
  display: 'mise-display-mode',
  theme: 'mise-theme-mode',
  ink: 'mise-ink',
  googleClientId: 'mise-google-oauth-client-id'
}

export const SESSION_TOKEN_KEY = 'mises-google-oauth-session-v1'
export const LEGACY_SESSION_TOKEN_KEY = 'mise-google-oauth-session-v1'

export const PROJECT_PREFIX = 'art-mises-project-v1:'
export const LEGACY_PROJECT_PREFIX = 'art-mise-project-v1:'

/** Clés copiées au démarrage. L’ancienne entrée n’est jamais supprimée ni écrasée. */
export const KEY_MIGRATIONS = [
  { kind: 'localStorage', from: LEGACY_LOCAL_KEYS.display, to: LOCAL_KEYS.display },
  { kind: 'localStorage', from: LEGACY_LOCAL_KEYS.theme, to: LOCAL_KEYS.theme },
  { kind: 'localStorage', from: LEGACY_LOCAL_KEYS.ink, to: LOCAL_KEYS.ink },
  { kind: 'localStorage', from: LEGACY_LOCAL_KEYS.googleClientId, to: LOCAL_KEYS.googleClientId },
  { kind: 'localStorage', from: `${LEGACY_PROJECT_PREFIX}*`, to: `${PROJECT_PREFIX}*` },
  { kind: 'sessionStorage', from: LEGACY_SESSION_TOKEN_KEY, to: SESSION_TOKEN_KEY },
  { kind: 'indexedDB', from: LEGACY_DB_NAME, to: DB_NAME }
]

export function createStores(db) {
  for (const name of ALL_STORES) {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' })
  }
}

function copyIfAbsent(storage, from, to) {
  if (storage.getItem(to) != null) return false
  const value = storage.getItem(from)
  if (value == null) return false
  storage.setItem(to, value)
  return true
}

export function migrateLocalKeys(storage = globalThis.localStorage) {
  if (!storage) return 0
  let copied = 0
  for (const key of Object.keys(LOCAL_KEYS)) {
    if (copyIfAbsent(storage, LEGACY_LOCAL_KEYS[key], LOCAL_KEYS[key])) copied += 1
  }
  const legacy = []
  for (let i = 0; i < storage.length; i += 1) {
    const name = storage.key(i)
    if (name && name.startsWith(LEGACY_PROJECT_PREFIX)) legacy.push(name)
  }
  for (const name of legacy) {
    const next = PROJECT_PREFIX + name.slice(LEGACY_PROJECT_PREFIX.length)
    if (copyIfAbsent(storage, name, next)) copied += 1
  }
  return copied
}

export function migrateSessionKeys(storage = globalThis.sessionStorage) {
  if (!storage) return 0
  return copyIfAbsent(storage, LEGACY_SESSION_TOKEN_KEY, SESSION_TOKEN_KEY) ? 1 : 0
}

async function databaseNames() {
  if (typeof indexedDB.databases !== 'function') return null
  const list = await indexedDB.databases()
  return new Set(list.map(item => item?.name).filter(Boolean))
}

export async function migrateDatabase() {
  const names = await databaseNames()
  if (!names || !names.has(LEGACY_DB_NAME)) return 0
  const legacy = await openDB(LEGACY_DB_NAME)
  const next = await openDB(DB_NAME, DB_VERSION, { upgrade: createStores })
  let copied = 0
  try {
    for (const store of ALL_STORES) {
      if (!legacy.objectStoreNames.contains(store) || !next.objectStoreNames.contains(store)) continue
      const rows = await legacy.getAll(store)
      for (const row of rows) {
        if (!row || typeof row.id !== 'string' || !row.id) continue
        const current = await next.get(store, row.id)
        if (current != null) continue
        await next.put(store, row)
        copied += 1
      }
    }
  } finally {
    legacy.close()
    next.close()
  }
  return copied
}

export async function migrateStorage() {
  migrateLocalKeys()
  migrateSessionKeys()
  return migrateDatabase()
}
