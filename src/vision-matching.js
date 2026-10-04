import { enrichObjects, normalize } from './data-bruitage.js'
import { labelPreference } from './learning.js'

// COCO labels are generic visual clues, never proof of a specific prop or sound.
const FRENCH = { bottle: 'bouteille', cup: 'tasse', 'wine glass': 'verre', bowl: 'bol', spoon: 'cuillère', fork: 'fourchette', knife: 'couteau', chair: 'chaise', 'dining table': 'table', book: 'livre', suitcase: 'valise', backpack: 'sac à dos', handbag: 'sac à main', umbrella: 'parapluie', scissors: 'ciseaux', clock: 'horloge', vase: 'vase', bench: 'banc', keyboard: 'clavier', laptop: 'ordinateur portable', 'cell phone': 'téléphone', remote: 'télécommande', tv: 'téléviseur', 'teddy bear': 'peluche', 'sports ball': 'ballon', bicycle: 'vélo', car: 'voiture', boat: 'bateau', bird: 'oiseau', cat: 'chat', dog: 'chien', 'potted plant': 'plante', couch: 'canapé', bed: 'lit', toothbrush: 'brosse à dents', banana: 'banane', apple: 'pomme', orange: 'orange' }
// French and English words a fiche may use for the same visual class, plus nearby props.
export const VISUAL_TERMS = {
  bottle: ['bouteille', 'gourde', 'flacon', 'bidon', 'thermos', 'canette'],
  cup: ['tasse', 'mug', 'gobelet'],
  'wine glass': ['verre', 'flute', 'verre a pied'],
  bowl: ['bol', 'saladier'],
  spoon: ['cuillere', 'cuiller'],
  fork: ['fourchette'],
  knife: ['couteau', 'lame'],
  chair: ['chaise', 'siege', 'fauteuil', 'tabouret'],
  'dining table': ['table'],
  book: ['livre', 'carnet', 'bouquin'],
  suitcase: ['valise', 'malle'],
  backpack: ['sac a dos'],
  handbag: ['sac a main'],
  umbrella: ['parapluie'],
  scissors: ['ciseaux'],
  clock: ['horloge', 'reveil'],
  vase: ['vase'],
  keyboard: ['clavier'],
  laptop: ['ordinateur'],
  'cell phone': ['telephone', 'portable'],
  remote: ['telecommande'],
  tv: ['televiseur'],
  'teddy bear': ['peluche'],
  'sports ball': ['ballon'],
  bicycle: ['velo'],
  car: ['voiture'],
  boat: ['bateau'],
  bird: ['oiseau'],
  cat: ['chat'],
  dog: ['chien'],
  'potted plant': ['plante'],
  couch: ['canape', 'sofa'],
  bed: ['lit'],
  toothbrush: ['brosse a dents'],
  bench: ['banc'],
  banana: ['banane'],
  apple: ['pomme'],
  orange: ['orange']
}
const NEARBY = {
  bottle: ['verre', 'tasse', 'gobelet'],
  cup: ['verre', 'bol'],
  'wine glass': ['tasse', 'bouteille'],
  bowl: ['tasse', 'assiette'],
  spoon: ['fourchette', 'couteau'],
  fork: ['cuillere', 'couteau'],
  knife: ['fourchette', 'cuillere'],
  chair: ['banc', 'tabouret', 'fauteuil'],
  'dining table': ['bureau'],
  book: ['carnet', 'revue'],
  suitcase: ['valise'],
  scissors: ['ciseaux']
}
const hasTerm = (names, terms) => (terms || []).some(term => {
  const needle = normalize(term)
  if (!needle) return false
  return names.some(name => name === needle || name.split(' ').includes(needle) || (needle.includes(' ') && name.includes(needle)))
})
const CATEGORY = { bottle: "bouteille d'eau" }
const UNRECOGNIZED = 'objet non reconnu'
const SKIP_LABELS = new Set(['person'])
// A broad class only proposes a fiche when its French word is really in the name.
export const GENERIC_CLASSES = new Set(['dining table', 'couch', 'bed', 'bench', 'potted plant', 'tv', 'laptop'])
export const PHOTO_PROPOSAL_HINT = 'Ceci est une proposition à confirmer, pas une identification certaine de l’objet de bruitage. L’analyse se fait sur cet appareil, même hors ligne. Les personnes sur la photo sont ignorées. Rien n’est ajouté à une caisse tant que vous n’avez pas confirmé.'
export const PHOTO_ANALYSIS_UNAVAILABLE = 'L’analyse photo n’est pas prête sur cet appareil. Ouvrez MISES! une fois avec une connexion, puis réessayez. Vous pouvez déjà saisir l’objet à la main.'
const HONEST = 'Proposition à confirmer, pas une identification certaine'
export function photoProposalStatus(count) {
  const n = Number(count) || 0
  if (!n) return 'Aucun objet proposé. Ce n’est pas une identification certaine. Ajoutez à la main ce que vous voyez, si besoin.'
  return `${n} objet(s) proposés localement · ${n} zone(s) proposée(s). Proposition à confirmer, pas une identification certaine de l’objet. Rien n’est ajouté à une caisse sans votre confirmation.`
}
function distinctiveWords(rawLabel) {
  const french = normalize(CATEGORY[rawLabel] || FRENCH[rawLabel] || '')
  if (!french) return []
  if (!french.includes(' ')) return french.length >= 3 ? [french] : []
  const words = french.split(' ').filter(word => word.length >= 4)
  return [...new Set([french, ...words])]
}
function isTight(names, rawLabel) {
  const words = distinctiveWords(rawLabel)
  if (!words.length) return false
  return names.some(name => words.some(word => word.includes(' ') ? name.includes(word) : name.split(' ').includes(word)))
}
export function genericCategory(label) {
  const raw = String(label || '')
  if (!raw) return ''
  return CATEGORY[raw] || FRENCH[raw] || UNRECOGNIZED
}
export const translateLabel = label => genericCategory(label)
export function searchFiches(objects, rawLabel, query = '') {
  const needle = normalize(query)
  const category = genericCategory(rawLabel)
  const terms = [normalize(rawLabel), category === UNRECOGNIZED ? '' : normalize(category), normalize(FRENCH[rawLabel] || '')].filter(Boolean)
  return (objects || []).map(object => {
    const names = [object.name, ...(object.aliases || []), ...(object.tags || []), object.family || ''].map(normalize).filter(Boolean)
    const exact = names.some(name => terms.includes(name))
    const synonym = !exact && hasTerm(names, VISUAL_TERMS[rawLabel])
    const partial = !exact && !synonym && names.some(name => terms.some(term => term && name.split(' ').includes(term)))
    const nearby = !exact && !synonym && !partial && hasTerm(names, NEARBY[rawLabel])
    const lexical = exact ? 1 : synonym ? .86 : partial ? .7 : nearby ? .58 : 0
    const queried = !needle || names.some(name => name.includes(needle))
    return { objectId: object.id, name: object.name, lexical, queried }
  }).filter(item => item.queried && (needle ? item.lexical || item.queried : item.lexical))
    .sort((a, b) => b.lexical - a.lexical || a.name.localeCompare(b.name, 'fr'))
}
export function closestFiches(candidates, limit = 3) {
  const list = (candidates || []).filter(item => item.lexical >= 0.7 && item.kind !== 'objet proche')
  const tight = list.filter(item => item.tight)
  return (tight.length ? tight : list).slice(0, limit)
}
export function correctionKey(label, context = '') { return JSON.stringify([normalize(label), normalize(context)]) }
export function matchDetections(detections, data, context = '', learnings = []) {
  const objects = enrichObjects(data), contextual = normalize(context).split(' ').filter(w => w.length > 2)
  return (detections || []).filter(d => !SKIP_LABELS.has(normalize(d.class || d.label))).map((d, index) => {
    const rawLabel = d.class || d.label, label = genericCategory(rawLabel)
    const recognized = label !== UNRECOGNIZED
    const visionScore = Math.max(0, Math.min(1, Number(d.score ?? d.confidence) || 0))
    const learned = data.corrections.find(c => c.id === correctionKey(rawLabel, context))
    const terms = [normalize(rawLabel), recognized ? normalize(label) : ''].filter(Boolean)
    const broad = GENERIC_CLASSES.has(rawLabel)
    const candidates = objects.map(object => {
      const names = [object.name, ...(object.aliases || []), ...(object.tags || []), object.family || ''].map(normalize).filter(Boolean)
      const exact = recognized && names.some(n => terms.includes(n))
      const synonym = !exact && recognized && hasTerm(names, VISUAL_TERMS[rawLabel])
      const partial = !exact && !synonym && recognized && names.some(n => terms.some(t => t && n.split(' ').includes(t)))
      const nearby = !exact && !synonym && !partial && recognized && !broad && hasTerm(names, NEARBY[rawLabel])
      const lexical = exact ? 1 : synonym ? .86 : partial ? .7 : nearby ? .58 : 0
      const kind = exact ? 'nom' : synonym ? 'synonyme' : partial ? 'mot' : nearby ? 'objet proche' : ''
      const tight = lexical >= 0.7 && isTight(names, rawLabel)
      const contextText = normalize([...(object.contexts || []), ...(object.sounds || []), object.family].join(' '))
      const contextualScore = contextual.length ? contextual.filter(w => contextText.split(' ').includes(w)).length / contextual.length : 0
      const categoryWords = normalize(label).split(' ').filter(word => word.length > 2 && word !== 'objet' && word !== 'reconnu')
      const categoryHit = lexical >= 0.7 && lexical < 1 && categoryWords.some(word => names.some(name => name.split(' ').includes(word)))
      const closeness = lexical + (tight ? 0.06 : categoryHit ? 0.04 : 0)
      // Context only ranks visually plausible candidates; it cannot invent detections.
      return { objectId: object.id, name: object.name, lexical, kind, tight, contextual: contextualScore, score: lexical ? Math.min(.99, visionScore * .55 + closeness * .35 + contextualScore * .1) : 0 }
    }).filter(c => c.lexical && (!broad || c.tight)).sort((a, b) => b.score - a.score)
    let best, learnedApplied = false
    if (learned?.action === 'match') {
      const object = objects.find(o => o.id === learned.objectId)
      if (object) { best = { objectId: object.id, name: object.name, score: 1 }; learnedApplied = true }
    }
    if (learned?.action === 'reject') { best = undefined; learnedApplied = true }
    let fromPreference = false
    if (!learnedApplied && learned?.action !== 'reject') {
      const pref = labelPreference(rawLabel, objects, learnings)
      if (pref) {
        const object = objects.find(item => item.id === pref.objectId)
        best = { objectId: object.id, name: object.name, score: .97 }
        learnedApplied = true
        fromPreference = true
      }
    }
    if (!learnedApplied && candidates.length && learnings.length) {
      for (const candidate of candidates) {
        const boost = learnings.filter(item => item && item.active !== false && item.objectId === candidate.objectId && (item.kind === 'use' || item.kind === 'photo-object' || (item.kind === 'vibe-feedback' && item.useful))).length
        candidate.score = Math.min(.99, candidate.score + Math.min(.08, boost * .02))
      }
      candidates.sort((a, b) => b.score - a.score)
    }
    if (!learnedApplied) {
      const exact = candidates.filter(item => item.lexical === 1)
      if (exact.length === 1) best = exact[0]
    }
    if (learnedApplied && best) {
      const known = candidates.findIndex(item => item.objectId === best.objectId)
      const preferred = known >= 0 ? candidates.splice(known, 1)[0] : { ...best, lexical: 1, kind: 'fiche mémorisée', tight: true }
      preferred.tight = true
      preferred.score = Math.max(preferred.score || 0, best.score || 0)
      candidates.unshift(preferred)
    }
    const strong = candidates.filter(item => item.lexical >= 0.7)
    const ambiguous = !learnedApplied && !best && strong.length > 1 && strong[0].score - strong[1].score < .12
    const hinted = !best && candidates[0]?.kind === 'objet proche'
    return { id: `detection-${index}`, rawLabel, label: best?.name || label, objectId: best?.objectId || '', bbox: d.bbox,
      confidence: best?.score || visionScore, visionScore, candidates: candidates.slice(0, 5), ambiguous,
      learned: learnedApplied, rejected: learned?.action === 'reject', validated: false, quantity: d.quantity || 1,
      needsReview: true, category: label, evidence: fromPreference ? `Apprentissage local · association validée, sans réentraînement. ${HONEST}` : learnedApplied ? `Correction humaine mémorisée pour ce contexte. ${HONEST}` : best ? `Vision + ${best.kind || 'nom'} dans la base. ${HONEST}` : strong.length ? `Catégorie ${label} · fiches proches dans la base. ${HONEST}` : hinted ? `Vision + objet proche dans la base : ${candidates[0].name}. ${HONEST}` : `Vision seule · aucune correspondance métier. ${HONEST}` }
  })
}
export function analyseMise(mise, proposals, confirmedIds = mise.checked || []) {
  const expected = new Set(mise.objectIds || []), present = [...new Set(confirmedIds)].filter(id => expected.has(id))
  const validated = proposals.filter(p => p.validated && !p.rejected)
  for (const p of validated) if (expected.has(p.objectId) && !present.includes(p.objectId)) present.push(p.objectId)
  return {
    present,
    missing: [...expected].filter(id => !present.includes(id)),
    extra: validated.filter(p => p.objectId && !expected.has(p.objectId)),
    unknown: proposals.filter(p => !p.objectId && !p.rejected),
    review: proposals.filter(p => !p.validated && !p.rejected)
  }
}
