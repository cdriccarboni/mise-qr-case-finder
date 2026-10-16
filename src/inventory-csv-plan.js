/** Import planner for physical inventories. Pure/read-only: callers must confirm before persisting. */
const tidy = value => String(value ?? '').trim()
const key = value => tidy(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const aliases = {
  name: ['nom', 'objet', 'article', 'designation', 'désignation', 'materiel', 'matériel'],
  container: ['contenant', 'valise', 'caisse', 'sac', 'case', 'container'],
  quantity: ['quantite', 'quantité', 'qte', 'qté', 'nombre', 'qty'],
  length: ['longueur', 'longueur m', 'metres', 'mètres', 'length'],
  color: ['couleur', 'color', 'coloris'],
  category: ['categorie', 'catégorie', 'famille', 'type'],
  location: ['emplacement', 'compartiment', 'pochette', 'localisation', 'location'],
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
function fingerprint(row) {
  return [row.container, row.category, row.name, row.length, row.color, row.location].map(key).join('|')
}
export function planInventoryCsv(rows, current = [], mapping = null) {
  if (!Array.isArray(rows)) throw new TypeError('Lignes CSV invalides')
  const columns = mapping || inventoryColumnMap(Object.keys(rows[0] || {}))
  if (!columns.name || !columns.container) throw new Error('Colonnes nom et contenant requises')
  const existingById = new Map(current.filter(item => tidy(item.id)).map(item => [tidy(item.id), item]))
  const existingByKey = new Map(current.map(item => [fingerprint(item), item]))
  const seen = new Set()
  const changes = [], errors = []
  rows.forEach((source, index) => {
    const row = Object.fromEntries(Object.keys(aliases).map(field => [field, tidy(source[columns[field]])]))
    const line = index + 2
    if (!row.name || !row.container) { errors.push({ line, reason: 'Nom ou contenant manquant' }); return }
    const quantity = row.quantity === '' ? 1 : Number(row.quantity.replace(',', '.'))
    if (!Number.isSafeInteger(quantity) || quantity < 0) { errors.push({ line, reason: 'Quantité invalide' }); return }
    row.quantity = quantity
    const signature = row.id ? `id:${row.id}` : `key:${fingerprint(row)}`
    if (seen.has(signature)) { errors.push({ line, reason: 'Ligne en double dans le fichier' }); return }
    seen.add(signature)
    const old = (row.id && existingById.get(row.id)) || existingByKey.get(fingerprint(row))
    changes.push({ line, action: !old ? 'create' : ['name','container','quantity','length','color','category','location'].every(field => String(old[field] ?? (field === 'quantity' ? 1 : '')) === String(row[field])) ? 'unchanged' : 'review', row, existingId: old?.id || null })
  })
  return { columns, changes, errors, summary: { create: changes.filter(x => x.action === 'create').length, review: changes.filter(x => x.action === 'review').length, unchanged: changes.filter(x => x.action === 'unchanged').length, errors: errors.length }, requiresConfirmation: true }
}
