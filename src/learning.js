import { normalize } from './data-bruitage.js'

export function newLearning(partial = {}) {
  return {
    id: partial.id || `learn-${crypto.randomUUID()}`,
    kind: partial.kind || 'note',
    active: partial.active !== false,
    label: partial.label || '',
    objectId: partial.objectId || '',
    caseId: partial.caseId || '',
    universeId: partial.universeId || '',
    useful: partial.useful,
    context: partial.context || '',
    note: partial.note || '',
    createdAt: partial.createdAt || new Date().toISOString(),
    reversible: true
  }
}

export function activeLearnings(list) {
  return (list || []).filter(item => item && item.active !== false)
}

export function labelPreference(rawLabel, objects, learnings) {
  const wanted = normalize(rawLabel)
  if (!wanted) return null
  const known = new Set((objects || []).map(object => object.id))
  return [...activeLearnings(learnings)].reverse().find(item => item.kind === 'label-preference' && normalize(item.label) === wanted && known.has(item.objectId)) || null
}

export function learningBoost(objectId, learnings, universeId = '') {
  let score = 0
  for (const item of activeLearnings(learnings)) {
    if (item.objectId !== objectId) continue
    if (item.kind === 'use' || item.kind === 'photo-object') score += 1
    if (item.kind === 'vibe-feedback' && (!universeId || item.universeId === universeId)) score += item.useful ? 3 : -3
  }
  return score
}
