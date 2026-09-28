/**
 * Couche relations souple MISES! — compatible future Data Bruitage.
 * SOURCE / NORMALIZED / DERIVED / GAME_DATA
 * Aucune liste de bruitages métier hardcodée : Foley DERIVED depuis les fiches.
 */
import { normalize, soundFields } from './data-bruitage.js'
import { UNIVERSES, PUBLIC_TECHNIQUES, locateObject } from './vibe-engine.js'

export const DATA_LAYER = { SOURCE: 'source', NORMALIZED: 'normalized', DERIVED: 'derived', GAME_DATA: 'game-data' }

export const OBJECT_STATUSES = [
  ['available', 'Disponible'], ['present', 'Présent'], ['absent', 'Absent'],
  ['missing', 'Manquant'], ['broken', 'Cassé'], ['lent', 'Prêté'],
  ['consumed', 'Consommé'], ['unavailable', 'Indisponible'], ['review', 'À vérifier']
]

const UNAVAILABLE = new Set(['absent', 'missing', 'broken', 'lent', 'consumed', 'unavailable'])

export function isObjectAvailable(object) {
  if (!object || object.owned === false) return false
  const status = String(object.status || 'available').toLowerCase()
  return !UNAVAILABLE.has(status)
}

export function objectHaystack(object) {
  const fields = soundFields(object)
  return normalize([
    object?.name, object?.detectedName, fields.hear, fields.imagine, object?.family,
    object?.device, object?.notes, ...(object?.sounds || []), ...(object?.aliases || []),
    ...(object?.tags || []), ...(object?.contexts || [])
  ].join(' '))
}

function uid(prefix, parts) {
  return `${prefix}-${normalize(parts).replace(/\s+/g, '-').slice(0, 48) || 'x'}`
}
function unique(list) { return [...new Set(list.filter(Boolean))] }
function uniqueBy(list, key) {
  const seen = new Set()
  return list.filter(item => {
    const id = item?.[key]
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function buildRelationGraph(input = {}) {
  const objects = (input.objects || []).map(o => ({ ...o, layer: DATA_LAYER.SOURCE }))
  const cases = (input.cases || []).map(c => ({ ...c, layer: DATA_LAYER.SOURCE }))
  const sounds = (input.sounds || []).map(s => ({ ...s, layer: DATA_LAYER.SOURCE }))
  const objectSounds = (input.objectSounds || []).map(l => ({ ...l, layer: DATA_LAYER.SOURCE }))
  const soundById = new Map(sounds.map(s => [s.id, s]))

  const foleys = []
  const objectFoley = []
  const foleyTechnique = []
  const foleyUniverse = []
  const objectContainer = []
  const foleyGameType = []
  const foleyPedagogy = []

  for (const object of objects) {
    const containerId = object.caseId || object.container_id || ''
    if (containerId) {
      objectContainer.push({ id: `oc-${object.id}-${containerId}`, objectId: object.id, containerId, layer: DATA_LAYER.SOURCE })
    }
    const fields = soundFields(object)
    const labels = unique([
      fields.hear,
      ...(object.sounds || []),
      ...objectSounds.filter(l => l.objectId === object.id).map(l => soundById.get(l.soundId)?.name).filter(Boolean)
    ].filter(Boolean))
    const explicitMethods = Array.isArray(object.methods)
      ? object.methods.filter(m => Array.isArray(m.objectIds) && m.objectIds.length).map(m => ({
        objectIds: [...m.objectIds], gesture: m.gesture || object.device || '', label: m.label || ''
      }))
      : []
    if (!labels.length && !explicitMethods.length) continue
    const targets = labels.length ? labels : [object.name || 'geste']
    for (const label of targets) {
      const foleyId = uid('foley', `${object.id}-${label}`)
      const methods = explicitMethods.length
        ? explicitMethods
        : [{ objectIds: [object.id], gesture: object.device || fields.hear || label, label: '' }]
      const foley = {
        id: foleyId, name: label, imagine: fields.imagine || '',
        objectIds: unique(methods.flatMap(m => m.objectIds)), methods,
        sourceObjectId: object.id, layer: DATA_LAYER.DERIVED, difficulty: null
      }
      foleys.push(foley)
      for (const method of methods) {
        for (const oid of method.objectIds) {
          objectFoley.push({ id: `of-${oid}-${foleyId}`, objectId: oid, foleyId, layer: DATA_LAYER.DERIVED })
        }
      }
      if (object.device) {
        const techId = uid('tech', object.device)
        foleyTechnique.push({
          id: `ft-${foleyId}-${techId}`, foleyId,
          technique: { id: techId, name: object.device, detail: object.notes || '', layer: DATA_LAYER.DERIVED },
          layer: DATA_LAYER.DERIVED
        })
      }
      const hay = objectHaystack(object)
      for (const tech of PUBLIC_TECHNIQUES) {
        const hit = (tech.serves || []).some(s => hay.includes(normalize(s))) || hay.includes(normalize(tech.name))
        if (hit) {
          foleyTechnique.push({
            id: `ft-${foleyId}-${tech.id}`, foleyId,
            technique: { ...tech, layer: DATA_LAYER.DERIVED }, layer: DATA_LAYER.DERIVED
          })
        }
      }
      const hayFull = hay + ' ' + normalize(label + ' ' + fields.imagine)
      for (const universe of UNIVERSES) {
        const hits = universe.triggers.reduce((sum, t) => sum + (hayFull.includes(normalize(t)) ? 1 : 0), 0)
        if (hits > 0) {
          foleyUniverse.push({
            id: `fu-${foleyId}-${universe.id}`, foleyId, universeId: universe.id,
            universeTitle: universe.title, score: hits, layer: DATA_LAYER.DERIVED
          })
        }
      }
      for (const gameType of ['A', 'B', 'C', 'G', 'I']) {
        foleyGameType.push({ id: `fg-${foleyId}-${gameType}`, foleyId, gameType, layer: DATA_LAYER.DERIVED })
      }
      foleyPedagogy.push({ id: `fp-${foleyId}-echo`, foleyId, activity: 'echauffement', layer: DATA_LAYER.DERIVED })
    }
  }

  return {
    layer: DATA_LAYER.DERIVED, objects, cases, sounds, objectSounds,
    objectById: new Map(objects.map(o => [o.id, o])),
    foleys, techniques: uniqueBy(foleyTechnique.map(x => x.technique), 'id'),
    universes: UNIVERSES.map(u => ({ id: u.id, title: u.title, layer: DATA_LAYER.DERIVED })),
    links: { objectFoley, foleyTechnique, foleyUniverse, objectContainer, foleyGameType, foleyPedagogy },
    locate: (object) => locateObject(object, cases)
  }
}

export function resolveObjectPool(graph, filters = {}) {
  let pool = (graph.objects || []).filter(isObjectAvailable)
  if (filters.objectIds?.length) {
    const wanted = new Set(filters.objectIds)
    pool = pool.filter(o => wanted.has(o.id))
  }
  if (filters.containerId) {
    pool = pool.filter(o => (o.caseId || o.container_id) === filters.containerId)
  }
  if (filters.category) {
    const cat = normalize(filters.category)
    pool = pool.filter(o => normalize(o.family || '').includes(cat) || (o.tags || []).some(t => normalize(t).includes(cat)))
  }
  if (filters.universeId || filters.universe) {
    const needle = normalize(filters.universeId || filters.universe)
    const linkedFoleyIds = new Set(
      (graph.links.foleyUniverse || [])
        .filter(l => normalize(l.universeId).includes(needle) || normalize(l.universeTitle).includes(needle))
        .map(l => l.foleyId)
    )
    const objectIds = new Set(
      (graph.links.objectFoley || []).filter(l => linkedFoleyIds.has(l.foleyId)).map(l => l.objectId)
    )
    pool = pool.filter(o => objectIds.has(o.id) || objectHaystack(o).includes(needle))
  }
  return pool
}

export function availableObjectIds(pool) { return new Set(pool.map(o => o.id)) }

export function completeMethods(foley, availableIds) {
  return (foley.methods || []).filter(m => (m.objectIds || []).every(id => availableIds.has(id)))
}

export function foleysPlayable(graph, availableIds, filters = {}) {
  let list = (graph.foleys || []).filter(f => completeMethods(f, availableIds).length > 0)
  if (filters.universeId || filters.universe) {
    const needle = normalize(filters.universeId || filters.universe)
    const linked = new Set(
      (graph.links.foleyUniverse || [])
        .filter(l => normalize(l.universeId).includes(needle) || normalize(l.universeTitle).includes(needle))
        .map(l => l.foleyId)
    )
    list = list.filter(f => linked.has(f.id) || normalize(f.name + ' ' + f.imagine).includes(needle))
  }
  return list
}

export function sharedSoundGroups(foleys) {
  const map = new Map()
  for (const f of foleys) {
    const key = normalize(f.name)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(f)
  }
  return [...map.values()]
}

export function supportedGameTypes(pool, foleys) {
  const n = pool.length
  const multiSound = pool.filter(o => {
    const fields = soundFields(o)
    return [fields.hear, ...(o.sounds || [])].filter(Boolean).length >= 2
  }).length
  const shared = sharedSoundGroups(foleys).filter(g => g.length >= 2).length
  const types = []
  if (foleys.length) types.push('A', 'B', 'G', 'I')
  if (multiSound) types.push('C')
  if (shared) types.push('D')
  if (n >= 2) types.push('E', 'J')
  if (n >= 3) types.push('F')
  if (n >= 4) types.push('H')
  return types
}

export function summarizeInventory(graph, filters = {}) {
  const pool = resolveObjectPool(graph, filters)
  const ids = availableObjectIds(pool)
  const foleys = foleysPlayable(graph, ids, filters)
  const universes = new Set(
    (graph.links.foleyUniverse || []).filter(l => foleys.some(f => f.id === l.foleyId)).map(l => l.universeId)
  )
  const gameTypes = supportedGameTypes(pool, foleys)
  return {
    objectCount: pool.length, foleyCount: foleys.length, universeCount: universes.size,
    challengeEstimate: foleys.length, gameTypeCount: gameTypes.length, gameTypes, objects: pool, foleys
  }
}
