// The catalogue is global. A kit or a project only references its objects.
export const TABLES = {
  objects: 'Objets', sounds: 'Sons', objectSounds: 'Relations Objet-Son',
  aliases: 'Alias', mises: 'Mises', cases: 'Contenants', sources: 'Sources',
  review: 'A verifier', corrections: 'Apprentissage'
}
export const DATA_STORES = Object.keys(TABLES)
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
export const newId = prefix => `${prefix}-${crypto.randomUUID()}`
export function emptyData() { return Object.fromEntries(DATA_STORES.map(key => [key, []])) }
export async function readData(db) {
  const tx = db.transaction(DATA_STORES)
  const rows = await Promise.all(DATA_STORES.map(key => tx.objectStore(key).getAll()))
  await tx.done
  return Object.fromEntries(DATA_STORES.map((key, i) => [key, rows[i]]))
}
export function validateRow(table, row) {
  if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || !row.id.trim()) throw new Error('Identifiant requis')
  if (['objects', 'sounds', 'cases', 'mises'].includes(table) && (typeof row.name !== 'string' || !row.name.trim())) throw new Error('Nom requis')
  for (const key of ['sounds', 'tags', 'contexts', 'aliases', 'objectIds', 'checked']) {
    if (row[key] !== undefined && (!Array.isArray(row[key]) || row[key].some(v => typeof v !== 'string'))) throw new Error(`${key} doit être une liste de textes`)
  }
  if (table === 'objectSounds' && (!row.objectId || !row.soundId)) throw new Error('Relation : objectId et soundId requis')
  if (table === 'aliases' && (!row.label || !['objects', 'sounds'].includes(row.targetType) || !row.targetId)) throw new Error('Alias : label, targetType et targetId requis')
  if (table === 'corrections' && (!row.label || typeof row.context !== 'string' || !['match', 'reject'].includes(row.action))) throw new Error('Correction invalide')
  return row
}
export function referenceError(table, row, data) {
  const has = (key, id) => !id || data[key].some(r => r.id === id)
  if (table === 'objectSounds' && (!has('objects', row.objectId) || !has('sounds', row.soundId))) return 'Objet ou son introuvable'
  if (table === 'aliases' && !has(row.targetType, row.targetId)) return 'Cible de l’alias introuvable'
  if (table === 'objects' && !has('cases', row.caseId || row.container_id)) return 'Contenant introuvable'
  if (table === 'mises' && (row.objectIds || []).some(id => !has('objects', id))) return 'Objet de mise introuvable'
  if (table === 'corrections' && row.action === 'match' && (!row.objectId || !has('objects', row.objectId))) return 'Objet appris introuvable'
  return ''
}
function stable(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map(v => JSON.parse(stable(v))))
  if (value && typeof value === 'object') return JSON.stringify(Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, JSON.parse(stable(value[k]))])))
  return JSON.stringify(value)
}
export function planImport(existing, incoming) {
  const additions = emptyData(), counts = { added: 0, unchanged: 0, review: 0 }
  const available = Object.fromEntries(DATA_STORES.map(key => [key, [...existing[key]]]))
  // Validate entities before references, then merge without overwriting any local record.
  for (const table of ['sources', 'cases', 'sounds', 'objects', 'mises', 'objectSounds', 'aliases', 'corrections', 'review']) {
    for (const original of incoming[table] || []) {
      const row = structuredClone(original)
      let reason = ''
      try { validateRow(table, row); reason = referenceError(table, row, available) } catch (error) { reason = error.message }
      const current = available[table].find(r => r.id === row?.id)
      if (current && stable(current) === stable(row)) { counts.unchanged++; continue }
      if (current) reason = 'Conflit : la version locale est conservée'
      if (reason) {
        const issue = { id: `review-${table}-${row?.id || newId('row')}`, table, proposed: row, reason, status: 'pending' }
        if (!available.review.some(r => r.id === issue.id)) {
          additions.review.push(issue); available.review.push(issue); counts.review++
        } else counts.unchanged++
      } else {
        additions[table].push(row); available[table].push(row); counts.added++
      }
    }
  }
  return { additions, counts }
}
export async function mergeData(db, incoming) {
  // A single transaction prevents a concurrent edit from being overwritten.
  const tx = db.transaction(DATA_STORES, 'readwrite')
  const rows = await Promise.all(DATA_STORES.map(key => tx.objectStore(key).getAll()))
  const existing = Object.fromEntries(DATA_STORES.map((key, i) => [key, rows[i]]))
  const plan = planImport(existing, incoming)
  await Promise.all(DATA_STORES.flatMap(key => plan.additions[key].map(row => tx.objectStore(key).put(row))))
  await tx.done
  return plan.counts
}
export async function saveReviewedRow(db, table, row, reviewId) {
  validateRow(table, row)
  const tx = db.transaction(DATA_STORES, 'readwrite')
  try {
    const entries = await Promise.all(DATA_STORES.map(key => tx.objectStore(key).getAll()))
    const data = Object.fromEntries(DATA_STORES.map((key, i) => [key, entries[i]]))
    const error = referenceError(table, row, data)
    if (error) throw new Error(error)
    await tx.objectStore(table).put({ ...row, humanValidated: true, updatedAt: new Date().toISOString() })
    if (reviewId) {
      const issue = await tx.objectStore('review').get(reviewId)
      await tx.objectStore('review').put({ ...issue, status: 'resolved', resolvedId: row.id })
    }
    await tx.done
  } catch (error) { tx.abort(); await tx.done.catch(() => {}); throw error }
}
export function enrichObjects(data) {
  return data.objects.map(object => ({ ...object,
    aliases: [...(object.aliases || []), ...data.aliases.filter(a => a.targetType === 'objects' && a.targetId === object.id).map(a => a.label)],
    sounds: [...new Set([...(object.sounds || []), ...data.objectSounds.filter(r => r.objectId === object.id).flatMap(r => {
      const sound = data.sounds.find(s => s.id === r.soundId)
      return sound ? [sound.name, ...(sound.aliases || []), ...data.aliases.filter(a => a.targetType === 'sounds' && a.targetId === sound.id).map(a => a.label)] : []
    })])]
  }))
}
