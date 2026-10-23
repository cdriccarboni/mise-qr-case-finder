import { entityUrl } from './qr-link.js'

/** URL externe d'une fiche : seuls les liens Web explicites sont acceptés. */
export function normalizeExternalUrl(value) {
  const url = String(value ?? '').trim()
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : ''
  } catch {
    return ''
  }
}

/** Texte imprimable : même URL, sans protocole ni slash terminal. */
export function shortExternalUrl(value) {
  const url = normalizeExternalUrl(value)
  return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

/** Normalisation sans perte des autres champs d'une fiche importée ou seedée. */
export function normalizeObjectLink(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || !Object.hasOwn(record, 'url')) return record
  return { ...record, url: normalizeExternalUrl(record.url) }
}

/** Cible de QR d'une fiche : le choix n'existe que si elle a un lien externe valide. */
export function objectLabelQrTarget(object, origin, choice = 'link') {
  const url = normalizeExternalUrl(object?.url)
  const hasExternalUrl = Boolean(url)
  const useLink = hasExternalUrl && choice !== 'record'
  return {
    hasExternalUrl,
    choices: hasExternalUrl ? ['link', 'record'] : [],
    choice: useLink ? 'link' : 'record',
    qrText: useLink ? url : entityUrl(origin, 'object', object?.id || ''),
    linkText: useLink ? shortExternalUrl(url) : ''
  }
}
