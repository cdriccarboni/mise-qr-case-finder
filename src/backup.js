import { DATA_STORES } from './data-bruitage.js'

const BACKUP_STORES = [...DATA_STORES, 'kits', 'learnings', 'settings']

export function backupItemCount(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 0
  return BACKUP_STORES.reduce((total, store) => total + (Array.isArray(payload[store]) ? payload[store].length : 0), 0)
}

function progress(onProgress, state) {
  if (typeof onProgress !== 'function') return
  try { onProgress(state) } catch {}
}

/**
 * Remplace uniquement les listes présentes dans le fichier.
 * La restauration est atomique : si une écriture échoue, aucune table n'est partiellement remplacée.
 * Les doublons d'identifiant sont remplacés par leur dernière occurrence et signalés dans le bilan.
 */
export async function applyBackup(db, payload, { onProgress } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Sauvegarde MISES! invalide')

  const stores = BACKUP_STORES.filter(store => Array.isArray(payload[store]) && db.objectStoreNames.contains(store))
  const totalIncoming = stores.reduce((total, store) => total + payload[store].length, 0)
  const report = { totalIncoming, imported: 0, duplicates: 0, invalid: 0, verified: false, stores: {} }

  if (!stores.length) {
    report.verified = true
    progress(onProgress, { processed: 0, total: 0, store: '', report })
    return report
  }

  const tx = db.transaction(stores, 'readwrite')
  let processed = 0

  try {
    for (const store of stores) {
      const target = tx.objectStore(store)
      const rows = payload[store]
      const seen = new Set()
      let imported = 0
      let duplicates = 0
      let invalid = 0

      await target.clear()

      for (const item of rows) {
        processed += 1
        if (!item || typeof item !== 'object' || item.id == null || String(item.id).trim() === '') {
          invalid += 1
          report.invalid += 1
          progress(onProgress, { processed, total: totalIncoming, store, report })
          continue
        }

        const id = String(item.id).trim()
        if (seen.has(id)) {
          duplicates += 1
          report.duplicates += 1
        } else {
          seen.add(id)
          imported += 1
          report.imported += 1
        }

        await target.put(item.id === id ? item : { ...item, id })
        progress(onProgress, { processed, total: totalIncoming, store, report })
      }

      const actual = await target.count()
      if (actual !== imported) throw new Error(`Restauration incomplète pour ${store} : ${actual}/${imported} élément(s) écrit(s)`)
      report.stores[store] = { incoming: rows.length, imported, duplicates, invalid, verified: true }
    }

    await tx.done
    report.verified = true
    progress(onProgress, { processed: totalIncoming, total: totalIncoming, store: '', report })
    return report
  } catch (error) {
    try { tx.abort() } catch {}
    try { await tx.done } catch {}
    throw error
  }
}
