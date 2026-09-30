const VARIATIONS = [
  'fond doux et régulier',
  'attaque courte',
  'réponse ponctuelle',
  'rythme régulier',
  'accent plus présent',
  'entrée tardive',
  'sortie progressive',
  'final bref'
]

const clean = value => String(value ?? '').trim()

export function participantCount(value, fallback = 1, max = 99) {
  const parsed = Math.floor(Number(value))
  const safeFallback = Math.max(1, Math.floor(Number(fallback)) || 1)
  if (!Number.isFinite(parsed)) return Math.min(max, safeFallback)
  return Math.min(max, Math.max(1, parsed))
}

export function buildParticipantPlan({ participants = 1, roles = [], objects = [], cues = [], context = 'bruitage' } = {}) {
  const count = participantCount(participants)
  const normalizedRoles = (roles || []).map(role => ({
    object: clean(role?.object || role?.objectName || role?.label),
    cue: clean(role?.cue || role?.gesture || role?.sound),
    role: clean(role?.role)
  })).filter(role => role.object || role.cue || role.role)

  const objectPool = [...new Set((objects || []).map(item => clean(item?.name || item)).filter(Boolean))]
  const cuePool = [...new Set((cues || []).map(clean).filter(Boolean))]
  const fallbackObjects = objectPool.length ? objectPool : ['matériel disponible']
  const fallbackCues = cuePool.length ? cuePool : ['geste sonore distinct']
  const pool = normalizedRoles.length
    ? normalizedRoles
    : fallbackObjects.flatMap((object, objectIndex) => [{
        object,
        cue: fallbackCues[objectIndex % fallbackCues.length],
        role: context
      }])

  return Array.from({ length: count }, (_, index) => {
    const base = pool[index % pool.length]
    const cycle = Math.floor(index / pool.length)
    const variation = count > pool.length
      ? VARIATIONS[(index + cycle) % VARIATIONS.length]
      : ''
    return {
      participant: index + 1,
      label: `Personne ${index + 1}`,
      object: base.object || fallbackObjects[index % fallbackObjects.length],
      cue: base.cue || fallbackCues[index % fallbackCues.length],
      role: base.role || context,
      variation
    }
  })
}
