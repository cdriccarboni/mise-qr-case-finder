/**
 * Moteur de jeux MISES! — déterministe, offline, inventaire réel uniquement.
 * Jeux A–J via generateChallenge / generateWorkshop. Leurres = GAME_DATA.
 */
import { normalize, soundFields } from './data-bruitage.js'
import { proposeVibe } from './vibe-engine.js'
import {
  DATA_LAYER, buildRelationGraph, resolveObjectPool, availableObjectIds,
  completeMethods, foleysPlayable, sharedSoundGroups, summarizeInventory, supportedGameTypes
} from './relations.js'
import { loadGameHistory, recentFingerprints } from './game-history.js'

export const GAME_TYPES = {
  A: { id: 'A', title: 'Fais ce son', needs: 'foley' },
  B: { id: 'B', title: 'Devine l’objet', needs: 'foley' },
  C: { id: 'C', title: 'Un objet, plusieurs sons', needs: 'multiSound' },
  D: { id: 'D', title: 'Un son, plusieurs solutions', needs: 'shared' },
  E: { id: 'E', title: 'Univers en jeu', needs: 'objects2' },
  F: { id: 'F', title: 'Intrus', needs: 'objects3' },
  G: { id: 'G', title: 'Bruitage mystère', needs: 'foley' },
  H: { id: 'H', title: 'Memory', needs: 'objects4' },
  I: { id: 'I', title: 'Défi express', needs: 'foley' },
  J: { id: 'J', title: 'Scène sonore', needs: 'objects2' }
}

export const GAME_TYPES_WAITING_DATA = [] // tous supportés dès que l’inventaire le permet

const DECOY_POOL = [
  { name: 'Un tricycle invisible', detail: 'Leurres de jeu — pas dans ta base.' },
  { name: 'Un orchestre de fourmis', detail: 'Leurres de jeu — pas dans ta base.' },
  { name: 'Une porte de château-fort', detail: 'Leurres de jeu — pas dans ta base.' },
  { name: 'Un moteur de fusée', detail: 'Leurres de jeu — pas dans ta base.' },
  { name: 'Un piano sous-marin', detail: 'Leurres de jeu — pas dans ta base.' }
]

function shuffle(list, rng = Math.random) {
  const items = [...list]
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

function pickAvoid(list, fingerprints, fingerprintOf, rng = Math.random) {
  if (!list.length) return null
  const fresh = list.filter(item => !fingerprints.has(fingerprintOf(item)))
  const pool = fresh.length ? fresh : list
  return pool[Math.floor(rng() * pool.length)]
}

function objectLabel(graph, id) {
  return graph.objectById.get(id)?.name || id
}

function foleyExplanation(graph, foley, availableIds) {
  const methods = completeMethods(foley, availableIds)
  const method = methods[0]
  const objects = (method?.objectIds || foley.objectIds || []).map(id => graph.objectById.get(id)).filter(Boolean)
  const tech = (graph.links.foleyTechnique || []).find(l => l.foleyId === foley.id)?.technique
  return {
    objects: objects.map(o => ({ id: o.id, name: o.name, location: graph.locate(o) })),
    technique: tech ? { name: tech.name, detail: tech.detail || '' } : null,
    gesture: method?.gesture || objects[0]?.device || foley.name,
    tips: [
      foley.imagine ? `Imaginer : ${foley.imagine}` : '',
      objects[0]?.notes || ''
    ].filter(Boolean),
    variants: methods.slice(1).map(m => ({
      gesture: m.gesture,
      objects: m.objectIds.map(id => objectLabel(graph, id))
    })),
    source: objects[0]?.source || 'Inventaire local',
    layer: DATA_LAYER.DERIVED
  }
}

function autoHints(graph, foley, availableIds) {
  const expl = foleyExplanation(graph, foley, availableIds)
  const hints = []
  if (expl.objects[0]?.location) hints.push(`Se trouve : ${expl.objects[0].location}`)
  if (expl.objects[0]?.name) {
    const name = expl.objects[0].name
    hints.push(`Initiales : ${name.split(/\s+/).map(w => w[0] || '').join('').toUpperCase()}`)
  }
  if (expl.technique?.name) hints.push(`Technique liée : ${expl.technique.name}`)
  if (foley.imagine) hints.push(`Univers suggéré : ${foley.imagine}`)
  return hints.filter(Boolean)
}

function buildChallenge(type, payload) {
  return {
    id: `chal-${type}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    gameType: type,
    title: GAME_TYPES[type].title,
    ...payload,
    layer: DATA_LAYER.DERIVED,
    provenance: 'generated'
  }
}

export function generateChallenge(filters = {}, data = {}, options = {}) {
  const graph = data.graph || buildRelationGraph(data)
  const history = options.history || loadGameHistory(options.storage)
  const fingerprints = recentFingerprints(history, 'challenge')
  const rng = options.rng || Math.random
  const pool = resolveObjectPool(graph, filters)
  const ids = availableObjectIds(pool)
  const foleys = foleysPlayable(graph, ids, filters)
  const typesWanted = filters.gameType
    ? [filters.gameType]
    : supportedGameTypes(pool, foleys)
  if (!pool.length) {
    return { ok: false, uncertain: ['Aucun objet disponible dans ce filtre. Aucun défi inventé.'], challenge: null }
  }
  if (!typesWanted.length) {
    return { ok: false, uncertain: ['Pas assez de données inventaire pour un jeu. Enrichis les fiches (son à entendre).'], challenge: null }
  }

  const builders = {
    A: () => {
      const foley = pickAvoid(foleys, fingerprints, f => `A:${f.id}`, rng)
      if (!foley) return null
      return buildChallenge('A', {
        prompt: `Fais entendre : « ${foley.name} ».`,
        instruction: 'Utilise uniquement les objets disponibles de ce filtre.',
        foleyId: foley.id,
        objectIds: completeMethods(foley, ids)[0]?.objectIds || [],
        fingerprint: `A:${foley.id}`,
        timerSec: filters.timerSec || null,
        hints: autoHints(graph, foley, ids),
        solution: foleyExplanation(graph, foley, ids)
      })
    },
    B: () => {
      const foley = pickAvoid(foleys, fingerprints, f => `B:${f.id}`, rng)
      if (!foley) return null
      const answer = graph.objectById.get(foley.sourceObjectId)
      return buildChallenge('B', {
        prompt: `Quel objet produit « ${foley.name} » ?`,
        instruction: 'Devine sans regarder la solution. Validation manuelle.',
        foleyId: foley.id,
        objectIds: answer ? [answer.id] : [],
        fingerprint: `B:${foley.id}`,
        timerSec: filters.timerSec || null,
        hints: autoHints(graph, foley, ids),
        solution: foleyExplanation(graph, foley, ids),
        choices: shuffle([
          answer?.name,
          ...shuffle(pool.filter(o => o.id !== answer?.id), rng).slice(0, 3).map(o => o.name)
        ].filter(Boolean), rng)
      })
    },
    C: () => {
      const candidates = pool.filter(o => [soundFields(o).hear, ...(o.sounds || [])].filter(Boolean).length >= 2)
      const object = pickAvoid(candidates, fingerprints, o => `C:${o.id}`, rng)
      if (!object) return null
      const sounds = unique([soundFields(object).hear, ...(object.sounds || [])].filter(Boolean))
      return buildChallenge('C', {
        prompt: `Avec « ${object.name} » seulement, enchaîne ${Math.min(3, sounds.length)} sons différents.`,
        instruction: sounds.map((s, i) => `${i + 1}. ${s}`).join(' · '),
        objectIds: [object.id],
        fingerprint: `C:${object.id}`,
        hints: [`Objet : ${object.name}`, graph.locate(object) ? `Lieu : ${graph.locate(object)}` : ''].filter(Boolean),
        solution: { objects: [{ id: object.id, name: object.name, location: graph.locate(object) }], gesture: sounds.join(' → '), tips: sounds, source: object.source || 'Inventaire local', variants: [] }
      })
    },
    D: () => {
      const groups = sharedSoundGroups(foleys).filter(g => g.length >= 2)
      const group = pickAvoid(groups, fingerprints, g => `D:${normalize(g[0].name)}`, rng)
      if (!group) return null
      const sound = group[0].name
      const objectIds = unique(group.flatMap(f => completeMethods(f, ids)[0]?.objectIds || []))
      return buildChallenge('D', {
        prompt: `Un seul son (« ${sound} »), plusieurs solutions.`,
        instruction: `Trouve au moins deux façons avec le matériel dispo (${objectIds.length} objets liés).`,
        foleyId: group[0].id,
        objectIds,
        fingerprint: `D:${normalize(sound)}`,
        hints: objectIds.slice(0, 2).map(id => `Piste : ${objectLabel(graph, id)}`),
        solution: {
          objects: objectIds.map(id => ({ id, name: objectLabel(graph, id), location: graph.locate(graph.objectById.get(id)) })),
          gesture: sound, tips: [`${group.length} méthodes inventaire`], source: 'Inventaire local', variants: []
        }
      })
    },
    E: () => {
      const universe = filters.universe || filters.universeId || 'forêt' 
      const vibe = proposeVibe(String(universe), pool, graph.cases, data.learnings || [])
      const owned = (vibe.proposals || []).flatMap(p => p.lines || []).filter(l => l.owned)
      if (!owned.length) return null
      return buildChallenge('E', {
        prompt: `Univers : ${vibe.universe?.title || universe}`,
        instruction: vibe.rhythm || 'Construisez l’ambiance avec les objets listés.',
        objectIds: unique(owned.map(l => l.objectId)),
        fingerprint: `E:${vibe.universe?.id || normalize(universe)}:${owned.map(l => l.objectId).sort().join(',')}`,
        hints: owned.slice(0, 3).map(l => `${l.objectName} — ${l.gesture}`),
        solution: {
          objects: owned.map(l => ({ id: l.objectId, name: l.objectName, location: l.location })),
          gesture: vibe.rhythm || '', tips: owned.map(l => l.gesture), source: 'Lexique local + inventaire', variants: []
        },
        vibe
      })
    },
    F: () => {
      if (pool.length < 3) return null
      const real = shuffle(pool, rng).slice(0, 3)
      const decoy = DECOY_POOL[Math.floor(rng() * DECOY_POOL.length)]
      const decoyCard = { id: `decoy-${Date.now()}`, name: decoy.name, detail: decoy.detail, layer: DATA_LAYER.GAME_DATA, owned: false }
      const cards = shuffle([...real.map(o => ({ id: o.id, name: o.name, owned: true, layer: DATA_LAYER.SOURCE })), decoyCard], rng)
      return buildChallenge('F', {
        prompt: 'Trouve l’intrus : un seul élément n’est pas dans ton inventaire.',
        instruction: 'Les leurres sont du GAME DATA temporaire — ils ne modifient pas ta base.',
        objectIds: real.map(o => o.id),
        fingerprint: `F:${real.map(o => o.id).sort().join('-')}`,
        cards,
        decoyId: decoyCard.id,
        hints: ['Un seul nom ne correspond à aucune fiche disponible.'],
        solution: {
          objects: real.map(o => ({ id: o.id, name: o.name, location: graph.locate(o) })),
          gesture: `Intrus : ${decoy.name}`, tips: [decoy.detail], source: 'GAME_DATA', variants: []
        }
      })
    },
    G: () => {
      const foley = pickAvoid(foleys, fingerprints, f => `G:${f.id}`, rng)
      if (!foley) return null
      return buildChallenge('G', {
        prompt: 'Bruitage mystère : fais le son sans nommer l’objet.',
        instruction: foley.imagine ? `Piste d’imaginaire : ${foley.imagine}` : 'Les autres devinent l’objet ou le lieu.',
        foleyId: foley.id,
        objectIds: completeMethods(foley, ids)[0]?.objectIds || [],
        fingerprint: `G:${foley.id}`,
        hints: autoHints(graph, foley, ids).filter(h => !/Initiales/.test(h)),
        solution: foleyExplanation(graph, foley, ids)
      })
    },
    H: () => {
      if (pool.length < 4) return null
      const picks = shuffle(pool, rng).slice(0, 4)
      const pairs = picks.flatMap(o => {
        const sound = soundFields(o).hear || (o.sounds || [])[0] || o.name
        return [
          { id: `mem-o-${o.id}`, kind: 'object', label: o.name, pairId: o.id, layer: DATA_LAYER.GAME_DATA },
          { id: `mem-s-${o.id}`, kind: 'sound', label: sound, pairId: o.id, layer: DATA_LAYER.GAME_DATA }
        ]
      })
      return buildChallenge('H', {
        prompt: 'Memory : associe chaque objet à son son de fiche.',
        instruction: 'Cartes mélangées. Validation manuelle des paires.',
        objectIds: picks.map(o => o.id),
        fingerprint: `H:${picks.map(o => o.id).sort().join('-')}`,
        cards: shuffle(pairs, rng),
        hints: ['Les sons viennent uniquement des fiches inventaire.'],
        solution: {
          objects: picks.map(o => ({ id: o.id, name: o.name, location: graph.locate(o) })),
          gesture: 'Paires objet ↔ son', tips: [], source: 'Inventaire local', variants: []
        }
      })
    },
    I: () => {
      const foley = pickAvoid(foleys, fingerprints, f => `I:${f.id}`, rng)
      if (!foley) return null
      const sec = filters.timerSec || 45
      return buildChallenge('I', {
        prompt: `Défi express (${sec} s) : « ${foley.name} ».`,
        instruction: 'Chrono optionnel. Puis validation manuelle.',
        foleyId: foley.id,
        objectIds: completeMethods(foley, ids)[0]?.objectIds || [],
        fingerprint: `I:${foley.id}`,
        timerSec: sec,
        hints: autoHints(graph, foley, ids),
        solution: foleyExplanation(graph, foley, ids)
      })
    },
    J: () => {
      if (pool.length < 2) return null
      const chosen = shuffle(pool, rng).slice(0, Math.min(4, pool.length))
      const universe = filters.universe || 'scène libre'
      return buildChallenge('J', {
        prompt: `Scène sonore (${universe}) avec ${chosen.length} objets.`,
        instruction: `Début → accident → fin. Objets : ${chosen.map(o => o.name).join(', ')}.`,
        objectIds: chosen.map(o => o.id),
        fingerprint: `J:${chosen.map(o => o.id).sort().join('-')}:${normalize(universe)}`,
        hints: chosen.map(o => `${o.name} (${graph.locate(o)})`),
        solution: {
          objects: chosen.map(o => ({ id: o.id, name: o.name, location: graph.locate(o) })),
          gesture: 'Plan-séquence à trois temps', tips: ['Pas d’objet hors liste'], source: 'Inventaire local', variants: []
        }
      })
    }
  }

  const order = shuffle(typesWanted, rng)
  for (const type of order) {
    const challenge = builders[type]?.()
    if (challenge) {
      return {
        ok: true, challenge, summary: summarizeInventory(graph, filters),
        uncertain: [], graph
      }
    }
  }
  return { ok: false, uncertain: ['Aucun défi constructible avec le filtre actuel.'], challenge: null, summary: summarizeInventory(graph, filters) }
}

function unique(list) { return [...new Set(list.filter(Boolean))] }

const WORKSHOP_TEMPLATES = {
  15: [
    { key: 'echauffement', title: 'Échauffement', minutes: 3, gameType: 'C' },
    { key: 'devine', title: 'Devine l’objet', minutes: 5, gameType: 'B' },
    { key: 'defi', title: 'Défi express', minutes: 4, gameType: 'I' },
    { key: 'libre', title: 'Création libre', minutes: 3, gameType: 'J' }
  ],
  30: [
    { key: 'echauffement', title: 'Échauffement', minutes: 5, gameType: 'C' },
    { key: 'devine', title: 'Devine l’objet', minutes: 7, gameType: 'B' },
    { key: 'defi', title: 'Défi', minutes: 6, gameType: 'A' },
    { key: 'univers', title: 'Univers collectif', minutes: 7, gameType: 'E' },
    { key: 'libre', title: 'Création libre', minutes: 5, gameType: 'J' }
  ],
  45: [
    { key: 'echauffement', title: 'Échauffement', minutes: 6, gameType: 'C' },
    { key: 'devine', title: 'Devine l’objet', minutes: 8, gameType: 'B' },
    { key: 'defi', title: 'Défi', minutes: 8, gameType: 'I' },
    { key: 'intrus', title: 'Intrus', minutes: 6, gameType: 'F' },
    { key: 'univers', title: 'Univers collectif', minutes: 10, gameType: 'E' },
    { key: 'libre', title: 'Création libre', minutes: 7, gameType: 'J' }
  ],
  60: [
    { key: 'echauffement', title: 'Échauffement', minutes: 8, gameType: 'C' },
    { key: 'memory', title: 'Memory', minutes: 8, gameType: 'H' },
    { key: 'devine', title: 'Devine l’objet', minutes: 8, gameType: 'B' },
    { key: 'defi', title: 'Défi', minutes: 10, gameType: 'A' },
    { key: 'univers', title: 'Univers collectif', minutes: 12, gameType: 'E' },
    { key: 'scene', title: 'Scène sonore', minutes: 8, gameType: 'J' },
    { key: 'libre', title: 'Création libre', minutes: 6, gameType: 'J' }
  ]
}

export function generateWorkshop(input = {}, data = {}, options = {}) {
  const duration = [15, 30, 45, 60].includes(Number(input.duration)) ? Number(input.duration) : 30
  const filters = {
    containerId: input.containerId || undefined,
    objectIds: input.objectIds,
    universe: input.universe || input.universeId,
    category: input.category,
    gameType: undefined
  }
  const graph = data.graph || buildRelationGraph(data)
  const history = options.history || loadGameHistory(options.storage)
  const summary = summarizeInventory(graph, filters)
  if (!summary.objectCount) {
    return { ok: false, uncertain: ['Aucun objet disponible pour cet atelier.'], workshop: null }
  }
  const template = WORKSHOP_TEMPLATES[duration]
  const usedFoleys = new Set()
  const usedFingerprints = recentFingerprints(history, 'workshop-step')
  const activities = []
  for (const step of template) {
    const result = generateChallenge({ ...filters, gameType: step.gameType, universe: filters.universe || 'forêt' }, { ...data, graph }, {
      history: { items: [...(history.items || []), ...[...usedFingerprints].map(fingerprint => ({ fingerprint, kind: 'challenge' }))] },
      rng: options.rng, storage: options.storage
    })
    if (!result.ok || !result.challenge) continue
    if (result.challenge.foleyId && usedFoleys.has(result.challenge.foleyId) && step.gameType !== 'J') {
      // try once more
      const again = generateChallenge({ ...filters, gameType: step.gameType }, { ...data, graph }, { history, rng: options.rng })
      if (again.ok && again.challenge && again.challenge.foleyId !== result.challenge.foleyId) {
        result.challenge = again.challenge
      }
    }
    if (result.challenge.foleyId) usedFoleys.add(result.challenge.foleyId)
    usedFingerprints.add(result.challenge.fingerprint)
    const objectIds = (result.challenge.objectIds || []).filter(id => summary.objects.some(o => o.id === id))
    if (step.gameType !== 'F' && !objectIds.length && !(result.challenge.objectIds || []).length) continue
    activities.push({
      key: step.key,
      title: step.title,
      minutes: step.minutes,
      gameType: step.gameType,
      prompt: result.challenge.prompt,
      instruction: result.challenge.instruction,
      objectIds: result.challenge.objectIds || [],
      objectsUseful: (result.challenge.objectIds || []).map(id => graph.objectById.get(id)?.name).filter(Boolean),
      challenge: result.challenge,
      conductor: {
        activity: step.title,
        consigne: result.challenge.instruction || result.challenge.prompt,
        objects: (result.challenge.objectIds || []).map(id => graph.objectById.get(id)?.name).filter(Boolean),
        durationMin: step.minutes
      }
    })
  }
  const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0)
  if (!activities.length) {
    return { ok: false, uncertain: ['Impossible de construire un atelier sans matériel inventé.'], workshop: null, summary }
  }
  return {
    ok: true,
    workshop: {
      id: `ws-${Date.now()}`,
      duration,
      totalMinutes,
      containerId: filters.containerId || null,
      universe: filters.universe || null,
      groupSize: Math.max(1, Number(input.groupSize) || 1),
      difficulty: input.difficulty || null, // non attribuée arbitrairement
      activities,
      summary,
      provenance: 'generated',
      layer: DATA_LAYER.DERIVED
    },
    uncertain: totalMinutes !== duration
      ? [`Durée planifiée ${totalMinutes} min (cible ${duration}) — activités adaptées aux objets disponibles.`]
      : []
  }
}

export function surprisePick(filters = {}, data = {}, options = {}) {
  const graph = data.graph || buildRelationGraph(data)
  const summary = summarizeInventory(graph, filters)
  const mode = shuffle(['challenge', 'foley', 'objects', 'universe'], options.rng || Math.random)[0]
  if (mode === 'challenge' || !summary.foleyCount) {
    return { kind: 'challenge', ...generateChallenge(filters, { ...data, graph }, options) }
  }
  if (mode === 'foley') {
    const foley = summary.foleys[Math.floor((options.rng || Math.random)() * summary.foleys.length)]
    return { kind: 'foley', foley, explanation: foleyExplanation(graph, foley, availableObjectIds(summary.objects)) }
  }
  if (mode === 'universe' && summary.universeCount) {
    const link = (graph.links.foleyUniverse || []).find(l => summary.foleys.some(f => f.id === l.foleyId))
    return { kind: 'universe', universeId: link?.universeId, title: link?.universeTitle, summary }
  }
  return {
    kind: 'objects',
    objects: shuffle(summary.objects, options.rng || Math.random).slice(0, Math.min(3, summary.objects.length))
      .map(o => ({ id: o.id, name: o.name, location: graph.locate(o) }))
  }
}

export { buildRelationGraph, summarizeInventory, foleyExplanation, autoHints, GAME_TYPES as GAMES }
