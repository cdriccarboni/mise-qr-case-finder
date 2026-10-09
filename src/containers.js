// Gestion de la hiérarchie des contenants (caisses, valises, boîtes, pochettes, trousses)
// Permet une profondeur illimitée : Caisse > Boîte > Pochette > Objet

export const CONTAINER_TYPES = [
  'Caisse',
  'Valise',
  'Boîte',
  'Pochette',
  'Trousse',
  'Bac',
  'Flight-case',
  'Contenant'
]

export function caseDisplayName(c) {
  if (!c) return 'Sans contenant'
  const partInfo = c.part && c.total ? ` · ${c.part}/${c.total}` : ''
  return `${c.name || 'Contenant'}${partInfo}`
}

/**
 * Calcule le fil d'Ariane complet (breadcrumb) d'un contenant
 * @param {string} caseId
 * @param {Array} allCases
 * @returns {Array} Liste ordonnée de la racine jusqu'au contenant
 */
export function caseBreadcrumb(caseId, allCases = []) {
  if (!caseId) return []
  const trail = []
  let current = allCases.find(c => c.id === caseId)
  const visited = new Set()

  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    trail.unshift(current)
    if (current.parentId) {
      current = allCases.find(c => c.id === current.parentId)
    } else {
      current = null
    }
  }

  return trail
}

/**
 * Retourne la chaîne du chemin complet : ex. "CAISSE ROSE > POCHETTE SPARE"
 * @param {string} caseId
 * @param {Array} allCases
 * @returns {string}
 */
export function casePathString(caseId, allCases = []) {
  const trail = caseBreadcrumb(caseId, allCases)
  if (!trail.length) return ''
  return trail.map(c => caseDisplayName(c)).join(' > ')
}

/**
 * Retourne le chemin complet pour un objet donné
 * @param {Object} object
 * @param {Array} allCases
 * @returns {string}
 */
export function objectPathString(object, allCases = []) {
  const caseId = object?.caseId || object?.container_id
  if (!caseId) return 'Sans contenant'
  const path = casePathString(caseId, allCases)
  return path || 'Sans contenant'
}

/**
 * Retourne les sous-contenants directs d'un contenant
 * @param {string} caseId
 * @param {Array} allCases
 * @returns {Array}
 */
export function directSubContainers(caseId, allCases = []) {
  if (!caseId) return []
  return allCases.filter(c => c.parentId === caseId)
}

/**
 * Retourne tous les IDs descendants d'un contenant (récursif)
 * @param {string} caseId
 * @param {Array} allCases
 * @returns {Set<string>}
 */
export function allDescendantCaseIds(caseId, allCases = []) {
  const ids = new Set()
  function collect(id) {
    const children = allCases.filter(c => c.parentId === id)
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id)
        collect(child.id)
      }
    }
  }
  collect(caseId)
  return ids
}

/**
 * Compte récursivement les objets dans un contenant et ses sous-contenants
 * @param {string} caseId
 * @param {Array} allCases
 * @param {Array} allObjects
 * @returns {{ directCount: number, totalCount: number, subCasesCount: number }}
 */
export function containerStats(caseId, allCases = [], allObjects = []) {
  const direct = allObjects.filter(o => (o.caseId || o.container_id) === caseId)
  const descendants = allDescendantCaseIds(caseId, allCases)
  const inSub = allObjects.filter(o => descendants.has(o.caseId || o.container_id))

  return {
    directCount: direct.length,
    totalCount: direct.length + inSub.length,
    subCasesCount: directSubContainers(caseId, allCases).length,
    allDescendantCount: descendants.size
  }
}
