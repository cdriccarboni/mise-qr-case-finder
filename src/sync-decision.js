/** Décision de synchronisation par révision (pure). Champs locaux : _syncRevision (base), _syncedAt. */
const T0 = '1970-01-01T00:00:00.000Z'
export const SYNC_META = ['_syncRevision', '_syncedAt']
export const localTime = row => row?.updatedAt || row?.createdAt || T0
export function stripSyncMeta(row) {
  const out = { ...row }; for (const k of SYNC_META) delete out[k]; return out
}
/**
 * Retourne {action:'push'|'pull'|'conflict'|'none', base}.
 * conflict : le serveur a une révision plus récente que la base locale ET la fiche a été modifiée localement.
 */
export function decideSync(local, cloud) {
  const base = Number.isInteger(local?._syncRevision) ? local._syncRevision : null
  const lt = localTime(local)
  if (!cloud) return { action: local ? 'push' : 'none', base: 0 }
  if (!local) return { action: 'pull', base: 0 }
  const rev = cloud.revision || 0, rt = cloud.updated_at || T0
  if (base === null) { // fiche jamais synchronisée avec contrôle de révision (héritage) : règle temporelle d'origine
    if (lt > rt) return { action: 'push', base: rev }
    if (rt > lt) return { action: 'pull', base: rev }
    return { action: 'none', base: rev, adopt: true }
  }
  const dirty = lt > (local._syncedAt || T0)
  if (rev > base) return { action: dirty ? 'conflict' : 'pull', base }
  return { action: dirty ? 'push' : 'none', base }
}
export function conflictEntry(store, local, cloud, at = new Date().toISOString()) {
  return { store, recordId: local?.id || cloud?.record_id, at, localRevision: local?._syncRevision ?? null, remoteRevision: cloud?.revision ?? null, localUpdatedAt: localTime(local), remoteUpdatedAt: cloud?.updated_at || null, local: stripSyncMeta(local || {}), remote: cloud?.payload || null }
}
export function appendConflicts(log = [], entries = [], max = 200) {
  const key = e => `${e.store}::${e.recordId}`
  const fresh = new Map(entries.map(e => [key(e), e]))
  return [...log.filter(e => !fresh.has(key(e))), ...fresh.values()].slice(-max)
}
