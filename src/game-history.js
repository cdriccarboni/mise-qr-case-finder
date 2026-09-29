const KEY = 'mises-game-history-v1'
const MAX = 40

export function loadGameHistory(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] }
    return { items: parsed.items.slice(0, MAX) }
  } catch { return { items: [] } }
}

export function rememberGameEvent(event, storage = globalThis.localStorage) {
  const history = loadGameHistory(storage)
  const entry = {
    at: new Date().toISOString(),
    kind: event.kind || 'challenge',
    id: event.id || '',
    fingerprint: event.fingerprint || '',
    gameType: event.gameType || '',
    foleyId: event.foleyId || '',
    objectIds: event.objectIds || []
  }
  history.items = [entry, ...history.items.filter(x => x.fingerprint !== entry.fingerprint)].slice(0, MAX)
  try { storage?.setItem(KEY, JSON.stringify(history)) } catch {}
  return history
}

export function recentFingerprints(history, kind) {
  return new Set((history?.items || []).filter(x => !kind || x.kind === kind).map(x => x.fingerprint).filter(Boolean))
}
