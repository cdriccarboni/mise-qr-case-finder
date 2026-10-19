const KINDS = { case: 'case', object: 'object', kit: 'kit', mise: 'mise' }

export function entityUrl(origin, kind, id) {
  const base = String(origin || '').split('#')[0].split('?')[0]
  const key = KINDS[kind] || 'case'
  return `${base}?${key}=${encodeURIComponent(id)}`
}

export function shortId(id) {
  const compact = String(id || '').replace(/[^a-zA-Z0-9]/g, '')
  return (compact.slice(-6) || 'MISE').toUpperCase()
}

export function readEntityUrl(text) {
  try {
    const url = new URL(String(text))
    return {
      caseId: url.searchParams.get('case') || '',
      objectId: url.searchParams.get('object') || '',
      kitId: url.searchParams.get('kit') || '',
      miseId: url.searchParams.get('mise') || ''
    }
  } catch {
    return null
  }
}

/**
 * Retrouve l'entité visée par un QR. ID complet prioritaire ; compatibilité avec
 * les anciens QR portant un ID court (6 derniers caractères) uniquement si non ambigu.
 */
export function resolveEntityId(scanned, list = []) {
  const value = String(scanned || '').trim()
  if (!value) return null
  const exact = list.find(item => item?.id === value)
  if (exact) return exact
  const compact = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (compact.length < 4 || compact.length > 8) return null
  const matches = list.filter(item => shortId(item?.id).endsWith(compact) || String(item?.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().endsWith(compact))
  return matches.length === 1 ? matches[0] : null
}
