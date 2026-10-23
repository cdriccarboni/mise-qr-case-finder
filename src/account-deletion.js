const DATABASES = ['mises-db', 'mise-db']
const APP_KEY = /^(?:mises-|mise-|sb-|supabase)/i
const PROJECT_KEY = /^art-mises-project-v1:|^art-mise-project-v1:/i

export function confirmPhraseOk(text) {
  return String(text ?? '').trim().toLocaleUpperCase('fr-FR') === 'SUPPRIMER'
}

function appKey(key) {
  return APP_KEY.test(key) || PROJECT_KEY.test(key)
}

function removeAppKeys(storage) {
  if (!storage) return 0
  const keys = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && appKey(key)) keys.push(key)
  }
  for (const key of keys) storage.removeItem(key)
  return keys.length
}

function deleteDatabase(indexedDB, name) {
  if (!indexedDB?.deleteDatabase) return Promise.resolve(false)
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error || new Error(`Suppression IndexedDB impossible : ${name}`))
    request.onblocked = () => resolve(false)
  })
}

async function clearMisesCaches(caches) {
  if (!caches?.keys || !caches?.delete) return []
  const names = (await caches.keys()).filter(name => /mises/i.test(name))
  await Promise.all(names.map(name => caches.delete(name)))
  return names
}

/** Efface uniquement les données locales connues de MISES!, avec globals injectables pour les tests. */
export async function clearLocalAppData({
  indexedDB = globalThis.indexedDB,
  localStorage = globalThis.localStorage,
  sessionStorage = globalThis.sessionStorage,
  caches = globalThis.caches
} = {}) {
  const deletedDatabases = []
  for (const name of DATABASES) if (await deleteDatabase(indexedDB, name)) deletedDatabases.push(name)
  const deletedLocalKeys = removeAppKeys(localStorage)
  const deletedSessionKeys = removeAppKeys(sessionStorage)
  const deletedCaches = await clearMisesCaches(caches)
  return { deletedDatabases, deletedLocalKeys, deletedSessionKeys, deletedCaches }
}
