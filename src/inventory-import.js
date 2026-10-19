/** Import CSV d'inventaire : parsing, projection de l'existant, application idempotente (pure). */
import { planInventoryCsv, inventoryColumnMap, normKey } from './inventory-csv-plan.js'
import { stableId } from './ids.js'
export { inventoryColumnMap }

export function parseCsvText(text) {
  const src = String(text ?? '').replace(/^\uFEFF/, '')
  const first = src.split(/\r?\n/, 1)[0] || ''
  const delim = [';', ',', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0]
  const out = []; let row = [], cell = '', quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row) }
  const rows = out.filter(r => r.some(v => String(v).trim() !== ''))
  const headers = (rows.shift() || []).map(h => h.trim())
  return { headers, rows: rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']))) }
}

const caseLabel = c => c?.importName || c?.name || ''
const ID_LIKE = /^[A-Z0-9][A-Z0-9_-]{2,}$/
/** Projette objets/contenants existants au format du planificateur. */
export function projectInventory(objects = [], cases = []) {
  const byId = new Map(cases.map(c => [c.id, c]))
  return objects.map(o => {
    const cid = o.caseId || o.container_id || ''
    const c = byId.get(cid)
    const parent = c?.parentId ? byId.get(c.parentId) : null
    const isCompartment = Boolean(parent && c?.importRole === 'compartment')
    return {
      id: o.id, importKey: o.importKey, name: o.name,
      container: isCompartment ? caseLabel(parent) : caseLabel(c),
      compartment: o.compartment ?? (isCompartment ? caseLabel(c) : ''),
      quantity: o.quantity ?? null, category: o.family || o.category || '', status: o.status || '',
      length: o.length || '', color: o.color || ''
    }
  })
}

export function planInventoryImport(rows, { objects = [], cases = [] } = {}, mapping = null) {
  return planInventoryCsv(rows, projectInventory(objects, cases), mapping)
}

/**
 * Applique un plan. create : nouvel objet (ID stable). unchanged : rien. review : seulement si
 * applyUpdates, en ne remplissant que les valeurs non vides du CSV (jamais d'effacement).
 * Contenant : uniquement celui nommé dans la ligne (jamais deviné) ; compartiment = sous-contenant.
 */
export function applyInventoryPlan(plan, { objects = [], cases = [] } = {}, { applyUpdates = false, now = new Date().toISOString(), sourceId = 'csv' } = {}) {
  const allCases = cases.slice(), newCases = [], writes = [], conflicts = []
  const findCase = (name, parentId = null) => (!parentId && allCases.find(c => c.id === name)) || allCases.find(c => normKey(caseLabel(c)) === normKey(name) && (parentId ? c.parentId === parentId : true) && (!parentId ? !c.parentId || c.importRole !== 'compartment' : true))
  // displayName (colonne « Nom contenant ») : nom lisible d'un contenant à ID permanent, posé seulement à la création
  // ou si le contenant porte encore son ID comme nom (jamais d'écrasement d'un nom choisi).
  const ensureCase = (name, parentId = null, displayName = '') => {
    let c = findCase(name, parentId)
    if (c && displayName && !parentId && c.id === name && (c.name || '') === name && displayName !== name) {
      c = { ...c, name: displayName, updatedAt: now }
      allCases[allCases.findIndex(x => x.id === c.id)] = c
      const k = newCases.findIndex(x => x.id === c.id); if (k === -1) newCases.push(c); else newCases[k] = c
    }
    if (!c) {
      const isId = !parentId && ID_LIKE.test(name)
      c = { id: isId ? name : stableId('case'), name: isId && displayName ? displayName : name, importName: name, parentId: parentId || '', type: parentId ? 'compartiment' : 'contenant', importRole: parentId ? 'compartment' : 'container', provenance: 'user-document', createdAt: now, updatedAt: now }
      allCases.push(c); newCases.push(c)
    }
    return c
  }
  const targetCaseId = row => {
    if (!row.container) return ''
    const top = ensureCase(row.container, null, row.containerName || '')
    return row.compartment ? ensureCase(row.compartment, top.id).id : top.id
  }
  for (const change of plan.changes) {
    const { row } = change
    if (change.action === 'unchanged') continue
    if (change.action === 'review') {
      if (!applyUpdates) { conflicts.push({ line: change.line, existingId: change.existingId, diff: change.diff }); continue }
      const old = objects.find(o => o.id === change.existingId)
      if (!old) continue
      const next = { ...old, updatedAt: now }
      for (const field of change.diff) {
        if (field === 'category') next.family = row.category
        else if (field === 'container' || field === 'compartment') { const id = targetCaseId(row); next.caseId = id; next.container_id = id; next.compartment = row.compartment || '' }
        else next[field] = row[field]
      }
      writes.push(next); continue
    }
    const caseId = targetCaseId(row)
    writes.push({
      id: row.id || stableId('obj'), importKey: row.importKey, name: row.name,
      caseId, container_id: caseId, compartment: row.compartment || '',
      quantity: row.quantity, family: row.category || 'À classer', status: row.status || 'provisoire',
      length: row.length || '', color: row.color || '', location: row.location || '', notes: row.notes || '',
      unassigned: !caseId, provenance: 'user-document', importSource: sourceId, photos: [], createdAt: now, updatedAt: now
    })
  }
  return { cases: newCases, objects: writes, conflicts }
}
