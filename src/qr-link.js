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
