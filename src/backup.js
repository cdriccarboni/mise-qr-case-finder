import { DATA_STORES } from './data-bruitage.js'

const BACKUP_STORES = [...DATA_STORES, 'kits', 'learnings', 'settings']

/** Remplace les listes présentes dans le fichier. Une clé absente n’efface rien. */
export async function applyBackup(db, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Sauvegarde MISES! invalide')
  for (const store of BACKUP_STORES) {
    if (!Array.isArray(payload[store]) || !db.objectStoreNames.contains(store)) continue
    await db.clear(store)
    for (const item of payload[store]) if (item?.id) await db.put(store, item)
  }
}
