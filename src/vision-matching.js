import { enrichObjects, normalize } from './data-bruitage.js'

// COCO labels are generic visual clues, never proof of a specific prop or sound.
const FRENCH = { bottle: 'bouteille', cup: 'tasse', 'wine glass': 'verre', bowl: 'bol', spoon: 'cuillère', fork: 'fourchette', knife: 'couteau', chair: 'chaise', 'dining table': 'table', book: 'livre', suitcase: 'valise', backpack: 'sac à dos', handbag: 'sac à main', umbrella: 'parapluie', scissors: 'ciseaux', clock: 'horloge', vase: 'vase', bench: 'banc', keyboard: 'clavier', laptop: 'ordinateur portable', 'cell phone': 'téléphone', remote: 'télécommande', tv: 'téléviseur', 'teddy bear': 'peluche', 'sports ball': 'ballon', bicycle: 'vélo', car: 'voiture', boat: 'bateau', bird: 'oiseau', cat: 'chat', dog: 'chien', 'potted plant': 'plante', couch: 'canapé', bed: 'lit', toothbrush: 'brosse à dents' }
export const translateLabel = label => FRENCH[label] || label
export function correctionKey(label, context = '') { return JSON.stringify([normalize(label), normalize(context)]) }
export function matchDetections(detections, data, context = '') {
  const objects = enrichObjects(data), contextual = normalize(context).split(' ').filter(w => w.length > 2)
  return detections.filter(d => normalize(d.class || d.label) !== 'person').map((d, index) => {
    const rawLabel = d.class || d.label, label = translateLabel(rawLabel)
    const visionScore = Math.max(0, Math.min(1, Number(d.score ?? d.confidence) || 0))
    const learned = data.corrections.find(c => c.id === correctionKey(rawLabel, context))
    const terms = [normalize(rawLabel), normalize(label)]
    const candidates = objects.map(object => {
      const names = [object.name, ...(object.aliases || []), ...(object.tags || [])].map(normalize)
      const exact = names.some(n => terms.includes(n))
      const partial = names.some(n => terms.some(t => t && n.split(' ').includes(t)))
      const lexical = exact ? 1 : partial ? .7 : 0
      const contextText = normalize([...(object.contexts || []), ...(object.sounds || []), object.family].join(' '))
      const contextualScore = contextual.length ? contextual.filter(w => contextText.split(' ').includes(w)).length / contextual.length : 0
      // Context only ranks visually plausible candidates; it cannot invent detections.
      return { objectId: object.id, name: object.name, lexical, contextual: contextualScore, score: lexical ? Math.min(.99, visionScore * .55 + lexical * .35 + contextualScore * .1) : 0 }
    }).filter(c => c.lexical).sort((a, b) => b.score - a.score)
    let best = candidates[0], learnedApplied = false
    if (learned?.action === 'match') {
      const object = objects.find(o => o.id === learned.objectId)
      if (object) { best = { objectId: object.id, name: object.name, score: 1 }; learnedApplied = true }
    }
    if (learned?.action === 'reject') { best = undefined; learnedApplied = true }
    const ambiguous = !learnedApplied && candidates.length > 1 && candidates[0].score - candidates[1].score < .12
    return { id: `detection-${index}`, rawLabel, label: best?.name || label, objectId: best?.objectId || '', bbox: d.bbox,
      confidence: best?.score || visionScore, visionScore, candidates: candidates.slice(0, 5), ambiguous,
      learned: learnedApplied, rejected: learned?.action === 'reject', validated: false, quantity: d.quantity || 1,
      needsReview: true, evidence: learnedApplied ? 'Correction humaine mémorisée pour ce contexte' : best ? 'Vision + nom/alias + contexte sonore' : 'Vision seule · aucune correspondance métier' }
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
