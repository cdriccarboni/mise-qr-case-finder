import { enrichObjects, normalize } from './data-bruitage.js'
import { labelPreference } from './learning.js'

// COCO labels are generic visual clues, never proof of a specific prop or sound.
const FRENCH = { bottle: 'bouteille', cup: 'tasse', 'wine glass': 'verre', bowl: 'bol', spoon: 'cuillère', fork: 'fourchette', knife: 'couteau', chair: 'chaise', 'dining table': 'table', book: 'livre', suitcase: 'valise', backpack: 'sac à dos', handbag: 'sac à main', umbrella: 'parapluie', scissors: 'ciseaux', clock: 'horloge', vase: 'vase', bench: 'banc', keyboard: 'clavier', laptop: 'ordinateur portable', 'cell phone': 'téléphone', remote: 'télécommande', tv: 'téléviseur', 'teddy bear': 'peluche', 'sports ball': 'ballon', bicycle: 'vélo', car: 'voiture', boat: 'bateau', bird: 'oiseau', cat: 'chat', dog: 'chien', 'potted plant': 'plante', couch: 'canapé', bed: 'lit', toothbrush: 'brosse à dents' }
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
export const translateLabel = label => FRENCH[label] || label
export function correctionKey(label, context = '') { return JSON.stringify([normalize(label), normalize(context)]) }
export function matchDetections(detections, data, context = '', learnings = []) {
  const objects = enrichObjects(data), contextual = normalize(context).split(' ').filter(w => w.length > 2)
  return detections.filter(d => normalize(d.class || d.label) !== 'person').map((d, index) => {
    const rawLabel = d.class || d.label, label = translateLabel(rawLabel)
    const visionScore = Math.max(0, Math.min(1, Number(d.score ?? d.confidence) || 0))
    const learned = data.corrections.find(c => c.id === correctionKey(rawLabel, context))
    const terms = [normalize(rawLabel), normalize(label)]
    const candidates = objects.map(object => {
      const names = [object.name, ...(object.aliases || []), ...(object.tags || []), object.family || ''].map(normalize).filter(Boolean)
      const exact = names.some(n => terms.includes(n))
      const synonym = !exact && hasTerm(names, VISUAL_TERMS[rawLabel])
      const partial = !exact && !synonym && names.some(n => terms.some(t => t && n.split(' ').includes(t)))
      const nearby = !exact && !synonym && !partial && hasTerm(names, NEARBY[rawLabel])
      const lexical = exact ? 1 : synonym ? .86 : partial ? .7 : nearby ? .58 : 0
      const kind = exact ? 'nom' : synonym ? 'synonyme' : partial ? 'mot' : nearby ? 'objet proche' : ''
      const contextText = normalize([...(object.contexts || []), ...(object.sounds || []), object.family].join(' '))
      const contextualScore = contextual.length ? contextual.filter(w => contextText.split(' ').includes(w)).length / contextual.length : 0
      // Context only ranks visually plausible candidates; it cannot invent detections.
      return { objectId: object.id, name: object.name, lexical, kind, contextual: contextualScore, score: lexical ? Math.min(.99, visionScore * .55 + lexical * .35 + contextualScore * .1) : 0 }
    }).filter(c => c.lexical).sort((a, b) => b.score - a.score)
    const strongMatch = list => list.find(item => item.lexical >= 0.7)
    let best = strongMatch(candidates), learnedApplied = false
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
      best = strongMatch(candidates)
    }
    const strong = candidates.filter(item => item.lexical >= 0.7)
    const ambiguous = !learnedApplied && strong.length > 1 && strong[0].score - strong[1].score < .12
    const hinted = !best && candidates[0]?.kind === 'objet proche'
    return { id: `detection-${index}`, rawLabel, label: best?.name || label, objectId: best?.objectId || '', bbox: d.bbox,
      confidence: best?.score || visionScore, visionScore, candidates: candidates.slice(0, 5), ambiguous,
      learned: learnedApplied, rejected: learned?.action === 'reject', validated: false, quantity: d.quantity || 1,
      needsReview: true, evidence: fromPreference ? 'Apprentissage local · association validée, sans réentraînement' : learnedApplied ? 'Correction humaine mémorisée pour ce contexte' : best ? `Vision + ${best.kind || 'nom'} dans la base` : hinted ? `Vision + objet proche dans la base : ${candidates[0].name}` : 'Vision seule · aucune correspondance métier' }
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
