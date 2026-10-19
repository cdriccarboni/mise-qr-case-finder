/**
 * Contenants MISES! intégrés à l'app : ID permanent + nom d'étiquette UNIQUEMENT (aucun objet, aucune quantité).
 * Disponibles sans compte et hors ligne dans « Étiquettes · Mes contenants ». QR = URL publique ?case=<id>.
 */
export const BUILTIN_CONTAINERS = Object.freeze([
  { id: 'SAC-NOIR-TECH-01', name: 'SAC NOIR TECHNIQUE' },
  { id: 'SAC-MICRO-02', name: 'PETIT SAC TECHNIQUE · MICRO BLEU' },
  { id: 'SAC-VIE-QUOT-01', name: 'VIE QUOTIDIENNE — 1/2' },
  { id: 'SAC-VIE-QUOT-02', name: 'VIE QUOTIDIENNE — 2/2' },
  { id: 'SAC-ANIM-MUS-PERC-01', name: 'ANIMAUX · MUSIQUE · PERCUSSIONS' },
  { id: 'KIT-ACOUSTIQUE-CC', name: 'KIT ACOUSTIQUE CÉCÉ' }
].map(c => Object.freeze({ ...c, type: 'contenant', builtin: true })))

/**
 * Fusionne par ID : jamais de doublon. Un contenant local garde son nom choisi ; s'il porte encore son ID
 * (ou aucun nom), le nom intégré est utilisé pour l'étiquette. Les contenants intégrés absents localement sont ajoutés.
 */
export function mergeLabelContainers(local = [], builtin = BUILTIN_CONTAINERS) {
  const byId = new Map(builtin.map(b => [b.id, b]))
  const out = local.map(c => {
    const b = byId.get(c.id)
    return b && (!c.name || c.name === c.id) ? { ...c, name: b.name } : c
  })
  const have = new Set(local.map(c => c.id))
  for (const b of builtin) if (!have.has(b.id)) out.push({ ...b })
  return out
}
