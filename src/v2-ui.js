/** Rendus HTML V2 (purs) : aperçu import CSV, résultats de recherche centrale, galerie photos. */
import { INVENTORY_FIELDS } from './inventory-csv-plan.js'
const FIELD_LABELS = { id: 'Identifiant', name: 'Objet *', container: 'Sac / contenant', compartment: 'Compartiment', quantity: 'Quantité', category: 'Catégorie', status: 'Statut', length: 'Longueur', color: 'Couleur', location: 'Emplacement', notes: 'Notes' }
const ACTION_LABELS = { create: 'Nouveau', review: 'Conflit / à revoir', unchanged: 'Inchangé' }

export function csvMappingHtml(headers, columns, esc) {
  return `<div class="csvMapping">${INVENTORY_FIELDS.map(f => `<label>${FIELD_LABELS[f]}<select data-map="${f}"><option value="">—</option>${headers.map(h => `<option ${columns[f] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></label>`).join('')}</div>`
}
export function csvPreviewHtml(plan, esc, limit = 200) {
  const s = plan.summary
  const unassigned = plan.changes.filter(c => c.action === 'create' && c.unassigned).length
  return `<div class="csvSummary" data-testid="csv-summary"><b data-create="${s.create}">${s.create} nouveau(x)</b> · <b data-review="${s.review}">${s.review} conflit(s)</b> · <span data-unchanged="${s.unchanged}">${s.unchanged} inchangé(s)</span> · <span>${s.errors} erreur(s)</span>${unassigned ? ` · <span>${unassigned} sans contenant (non assigné)</span>` : ''}</div>
  <div class="csvPreview"><table><thead><tr><th>L.</th><th>Action</th><th>Objet</th><th>Contenant</th><th>Qté</th><th>Écarts</th></tr></thead><tbody>
  ${plan.changes.filter(c => c.action !== 'unchanged').slice(0, limit).map(c => `<tr class="csv-${c.action}"><td>${c.line}</td><td>${ACTION_LABELS[c.action]}</td><td>${esc(c.row.name)}</td><td>${esc([c.row.container, c.row.compartment].filter(Boolean).join(' > ') || '— non assigné')}</td><td>${c.row.quantity ?? '<i>vide</i>'}</td><td>${esc((c.diff || []).join(', '))}</td></tr>`).join('')}
  ${plan.errors.map(e => `<tr class="csv-error"><td>${e.line}</td><td>Erreur</td><td colspan="4">${esc(e.reason)}</td></tr>`).join('')}
  </tbody></table></div>`
}
const KIND_ICON = { objet: '◌', contenant: '▣', bruitage: '♪', technique: '✋' }
export function centralResultsHtml(results, esc) {
  if (!results.length) return ''
  return `<div class="resultHead"><b>Recherche centrale · ${results.length}</b><span>Objets, contenants, bruitages, techniques.</span></div>` + results.slice(0, 12).map(r => {
    const sub = r.kind === 'objet'
      ? [r.path ? `📦 ${esc(r.path)}` : 'Sans contenant', r.techniques?.length ? `Techniques : ${esc(r.techniques.join(', '))}` : '', r.sounds?.length ? `Sons : ${esc(r.sounds.slice(0, 4).join(', '))}` : ''].filter(Boolean).join(' · ')
      : r.kind === 'contenant' ? `${esc(r.path)} · ${r.objects.length} objet(s)`
      : [(r.objects || []).slice(0, 4).map(o => `${esc(o.name)}${o.path ? ` (${esc(o.path)})` : ''}`).join(', ') || 'Aucun objet lié', r.techniques?.length ? `Techniques : ${esc(r.techniques.join(', '))}` : ''].filter(Boolean).join(' · ')
    const open = r.kind === 'objet' ? `data-central-open="${esc(r.id)}"` : r.kind === 'contenant' ? `data-central-case="${esc(r.id)}"` : (r.objects?.[0] ? `data-central-open="${esc(r.objects[0].id)}"` : '')
    return `<article class="result centralResult" data-kind="${r.kind}"><div class="thumb">${KIND_ICON[r.kind]}</div><div><h3>${esc(r.label)} <small class="kindBadge">${r.kind}</small></h3><small>${sub}</small></div>${open ? `<button ${open} class="miniAction" type="button" aria-label="Afficher le résultat">↗</button>` : ''}</article>`
  }).join('')
}
export function photoGalleryHtml(o, esc) {
  const photos = o.photos || []
  return `<div class="photoGallery">${photos.map(p => `<figure data-photo="${esc(p.id)}"><img src="${esc(p.thumb || p.dataUrl || '')}" alt="${esc(o.name)}" ${!p.thumb && !p.dataUrl && p.remotePath ? `data-remote="${esc(p.remotePath)}"` : ''}><figcaption>${p.status === 'uploaded' ? '☁' : '⏳ local'}</figcaption></figure>`).join('')}</div>`
}
