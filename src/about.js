/** Site d'Acousmatic Theatre. */
export const ACOUSMATIC_THEATRE_URL = 'https://www.acousmatic-theatre.fr/'

/**
 * Site personnel de Cédric Carboni.
 * TODO: renseigner l'adresse dès qu'elle est connue.
 * Tant que cette constante est vide, le lien n'est pas affiché.
 * Ne pas inventer d'URL.
 */
export const AUTHOR_WEBSITE_URL = ''

export function externalAnchor(href, label, dataset = '') {
  if (!href) return ''
  const extra = dataset ? ` ${dataset}` : ''
  return `<a class="link aboutLink" href="${href}" target="_blank" rel="noopener noreferrer" data-external${extra}>${label}</a>`
}
