/** Recherche centrale : objets, bruitages (sons), techniques, contenants. Pure. */
import { normalize } from './data-bruitage.js'
import { casePathString } from './containers.js'

const words = q => normalize(q).split(' ').filter(Boolean)
function score(text, q) {
  const t = normalize(text), w = words(q)
  if (!w.length) return 0
  const hits = w.filter(x => t.includes(x)).length
  if (hits < w.length) return 0
  return hits + (t.includes(normalize(q)) ? 10 : 0)
}
/** Index many-to-many objet <-> son à partir de objectSounds, o.sounds et o.methods. */
export function buildCentralIndex({ objects = [], cases = [], sounds = [], objectSounds = [] } = {}) {
  const soundById = new Map(sounds.map(s => [s.id, s]))
  const objectById = new Map(objects.map(o => [o.id, o]))
  const soundsOf = new Map(), objectsOf = new Map(), techniquesOf = new Map()
  const link = (oid, label, sid = null, technique = '') => {
    if (!oid || !label) return
    if (!soundsOf.has(oid)) soundsOf.set(oid, new Map())
    soundsOf.get(oid).set(normalize(label), { id: sid, label })
    const k = sid || `label:${normalize(label)}`
    if (!objectsOf.has(k)) objectsOf.set(k, { id: k, label, objectIds: new Set(), techniques: new Set() })
    objectsOf.get(k).objectIds.add(oid)
    if (technique) { objectsOf.get(k).techniques.add(technique); if (!techniquesOf.has(oid)) techniquesOf.set(oid, new Set()); techniquesOf.get(oid).add(technique) }
  }
  for (const r of objectSounds) {
    const oid = r.object_id || r.objectId, sid = r.sound_id || r.soundId
    link(oid, soundById.get(sid)?.name || r.sound || sid, sid, r.technique || r.method || '')
  }
  for (const o of objects) {
    for (const s of o.sounds || []) link(o.id, typeof s === 'string' ? s : s?.name)
    for (const m of o.methods || []) link(o.id, m.sound || m.name || o.sounds?.[0], null, m.technique || m.name || '')
    if (o.technique) { if (!techniquesOf.has(o.id)) techniquesOf.set(o.id, new Set()); techniquesOf.get(o.id).add(o.technique) }
  }
  const pathOf = o => { const cid = o?.caseId || o?.container_id; return cid ? casePathString(cid, cases) : '' }
  const rows = []
  for (const o of objects) {
    const snd = [...(soundsOf.get(o.id)?.values() || [])].map(x => x.label)
    const tech = [...(techniquesOf.get(o.id) || [])]
    rows.push({ kind: 'objet', id: o.id, label: o.name, objectId: o.id, sounds: snd, techniques: tech, path: pathOf(o), text: [o.name, o.nickname, o.family, o.notes, o.compartment, ...(o.aliases || []), ...(o.tags || []), ...snd, ...tech].join(' ') })
  }
  for (const s of objectsOf.values()) {
    const objs = [...s.objectIds].map(id => objectById.get(id)).filter(Boolean)
    rows.push({ kind: 'bruitage', id: s.id, label: s.label, techniques: [...s.techniques], objects: objs.map(o => ({ id: o.id, name: o.name, path: pathOf(o) })), text: [s.label, ...s.techniques, ...(soundById.get(s.id)?.aliases || [])].join(' ') })
  }
  for (const s of sounds) if (!objectsOf.has(s.id)) rows.push({ kind: 'bruitage', id: s.id, label: s.name, techniques: [], objects: [], text: [s.name, ...(s.aliases || []), ...(s.tags || [])].join(' ') })
  const techRows = new Map()
  for (const [oid, set] of techniquesOf) for (const t of set) {
    const k = normalize(t); if (!techRows.has(k)) techRows.set(k, { kind: 'technique', id: `tech:${k}`, label: t, objects: [], text: t })
    const o = objectById.get(oid); if (o) techRows.get(k).objects.push({ id: o.id, name: o.name, path: pathOf(o) })
  }
  rows.push(...techRows.values())
  for (const c of cases) {
    const inside = objects.filter(o => (o.caseId || o.container_id) === c.id)
    rows.push({ kind: 'contenant', id: c.id, label: c.name, path: casePathString(c.id, cases), objects: inside.map(o => ({ id: o.id, name: o.name })), text: [c.name, c.location, c.notes, c.type].join(' ') })
  }
  return rows
}
const ORDER = { objet: 0, contenant: 1, bruitage: 2, technique: 3 }
export function centralSearch(index, query, limit = 30) {
  if (!words(query).length) return []
  return index.map(r => ({ ...r, _score: score(r.text, query) + (normalize(r.label).includes(normalize(query)) ? 5 : 0) }))
    .filter(r => r._score > 0)
    .sort((a, b) => b._score - a._score || ORDER[a.kind] - ORDER[b.kind] || String(a.label).localeCompare(String(b.label), 'fr'))
    .slice(0, limit)
}
