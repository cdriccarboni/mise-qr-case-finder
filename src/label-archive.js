/**
 * Étiquettes · Mes contenants : archiver / restaurer ; suppression legacy compatible.
 * Aucun contenant n'est intégré au code public : chaque utilisateur crée les siens ; ceux du propriétaire
 * arrivent depuis SON espace Supabase (seed owner-only). Un contenant protégé (seed) peut être archivé,
 * jamais supprimé. `deleteCase` conserve son ancien marqueur pour les appelants
 * historiques ; l'interface utilise désormais record-purge.js pour effacer la fiche
 * locale et programmer une purge distante réelle.
 */
export const isProtectedCase = c => Boolean(c?.protected || c?.builtin)
export const labelState = c => c?.labelState === 'archived' || c?.labelState === 'deleted' ? c.labelState : 'active'
export const activeLabelCases = (cases = []) => cases.filter(c => labelState(c) === 'active')
export const archivedLabelCases = (cases = []) => cases.filter(c => labelState(c) === 'archived')
const stamp = (c, patch, now) => ({ ...c, ...patch, updatedAt: now || new Date().toISOString() })
export function archiveCase(c, now) {
  if (labelState(c) === 'deleted') throw new Error('Contenant supprimé')
  return stamp(c, { labelState: 'archived', archivedAt: now || new Date().toISOString() }, now)
}
export function restoreCase(c, now) {
  if (labelState(c) === 'deleted') throw new Error('Contenant supprimé')
  const next = stamp(c, { labelState: 'active' }, now); delete next.archivedAt; return next
}
export function canDeleteCase(c, objects = []) {
  if (isProtectedCase(c)) return { ok: false, reason: 'protected' }
  if (objects.some(o => (o.caseId || o.container_id) === c.id)) return { ok: false, reason: 'not-empty' }
  return { ok: true }
}
export function deleteCase(c, objects = [], now) {
  const v = canDeleteCase(c, objects)
  if (!v.ok) throw Object.assign(new Error(v.reason === 'protected' ? 'Contenant protégé : archivable, jamais supprimable' : 'Contenant non vide'), { code: v.reason })
  return stamp(c, { labelState: 'deleted', deletedAt: now || new Date().toISOString() }, now)
}
