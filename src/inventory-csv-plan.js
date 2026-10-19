/** Import planner for physical inventories. Pure/read-only: callers must confirm before persisting. */
import { textDigest } from './ids.js'
const tidy = value => String(value ?? '').trim()
export const normKey = value => tidy(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const key = normKey
export const INVENTORY_FIELDS = ['id', 'name', 'container', 'compartment', 'quantity', 'category', 'status', 'length', 'color', 'location', 'notes']
const aliases = {
  name: ['nom', 'objet', 'article', 'designation', 'désignation', 'materiel', 'matériel'],
  container: ['contenant', 'valise', 'caisse', 'sac', 'case', 'container', 'sac contenant', 'sac/contenant'],
  compartment: ['compartiment', 'pochette', 'sous contenant', 'sous-contenant', 'poche', 'tiroir'],
  quantity: ['quantite', 'quantité', 'qte', 'qté', 'nombre', 'qty'],
  length: ['longueur', 'longueur m', 'metres', 'mètres', 'length'],
  color: ['couleur', 'color', 'coloris'],
  category: ['categorie', 'catégorie', 'famille', 'type'],
  status: ['statut', 'etat', 'état', 'status'],
  location: ['emplacement', 'localisation', 'location'],
  notes: ['notes', 'note', 'remarque', 'remarques', 'commentaire'],
  id: ['id', 'identifiant', 'reference', 'référence', 'sku']
}
export function inventoryColumnMap(headers) {
  const result = {}
  for (const [target, names] of Object.entries(aliases)) {
    const position = headers.findIndex(header => [target, ...names].some(candidate => key(header) === key(candidate)))
    if (position !== -1) result[target] = headers[position]
  }
  return result
}
/** Clé stable d'import : contenant + compartiment + nom (+ longueur/couleur pour distinguer les câbles). */
export function importKey(row) {
  return 'imp-' + textDigest([row.container, row.compartment, row.name, row.length, row.color].map(key).join('|'))
}
const COMPARED = ['name', 'container', 'compartment', 'quantity', 'length', 'color', 'category', 'status']
const same = (a, b) => String(a ?? '') === String(b ?? '')
export function planInventoryCsv(rows, current = [], mapping = null) {
  if (!Array.isArray(rows)) throw new TypeError('Lignes CSV invalides')
  const columns = mapping || inventoryColumnMap(Object.keys(rows[0] || {}))
  if (!columns.name || !columns.container) throw new Error('Colonnes nom et contenant requises')
  const existingById = new Map(current.filter(item => tidy(item.id)).map(item => [tidy(item.id), item]))
  const existingByKey = new Map(current.map(item => [item.importKey || importKey(item), item]))
  const seen = new Set()
  const changes = [], errors = []
  rows.forEach((source, index) => {
    const row = Object.fromEntries(INVENTORY_FIELDS.map(field => [field, tidy(source[columns[field]])]))
    const line = index + 2
    if (!row.name) { errors.push({ line, reason: 'Nom manquant' }); return }
    // Jamais de quantité inventée : vide reste vide (null).
    if (row.quantity === '') row.quantity = null
    else {
      const quantity = Number(row.quantity.replace(',', '.'))
      if (!Number.isSafeInteger(quantity) || quantity < 0) { errors.push({ line, reason: 'Quantité invalide' }); return }
      row.quantity = quantity
    }
    row.importKey = importKey(row)
    const signature = row.id ? `id:${row.id}` : `key:${row.importKey}`
    if (seen.has(signature)) { errors.push({ line, reason: 'Ligne en double dans le fichier' }); return }
    seen.add(signature)
    const old = (row.id && existingById.get(row.id)) || existingByKey.get(row.importKey)
    const diff = old ? COMPARED.filter(field => row[field] !== '' && row[field] !== null && !same(old[field], row[field])) : []
    const action = !old ? 'create' : diff.length ? 'review' : 'unchanged'
    changes.push({ line, action, row, existingId: old?.id || null, diff, unassigned: !row.container })
  })
  return { columns, changes, errors, summary: { create: changes.filter(x => x.action === 'create').length, review: changes.filter(x => x.action === 'review').length, unchanged: changes.filter(x => x.action === 'unchanged').length, errors: errors.length }, requiresConfirmation: true }
}
