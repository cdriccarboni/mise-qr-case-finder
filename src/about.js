/** Site d'Acousmatic Theatre. */
export const ACOUSMATIC_THEATRE_URL = 'https://www.acousmatic-theatre.fr/'

/** Dépôt GitHub. Le nom du dépôt ne change pas. */
export const REPOSITORY_URL = 'https://github.com/cdriccarboni/mise-qr-case-finder'
/** Page publique GitHub Pages (branche main). */
export const PUBLIC_SITE_URL = 'https://cdriccarboni.github.io/mise-qr-case-finder/'
/** Politique de confidentialité. Le chemin publié reste privacy.html. */
export const PRIVACY_URL = 'https://cdriccarboni.github.io/mise-qr-case-finder/privacy.html'

/**
 * Site personnel de Cédric Carboni.
 * Tant que cette constante est vide, le lien n'est pas affiché.
 */
export const AUTHOR_WEBSITE_URL = 'https://carboni-cedric.pages-perso.free.fr/'

export function externalAnchor(href, label, dataset = '') {
  if (!href) return ''
  const extra = dataset ? ` ${dataset}` : ''
  return `<a class="link aboutLink" href="${href}" target="_blank" rel="noopener noreferrer" data-external${extra}>${label}</a>`
}
