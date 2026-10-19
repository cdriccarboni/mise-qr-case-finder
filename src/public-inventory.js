/** Inventaire public lecture seule (sans compte) : chargement RPC, assainissement, rendu mobile. */
import { buildCentralIndex, centralSearch } from './central-search.js'
import { casePathString, directSubContainers, allDescendantCaseIds } from './containers.js'

export const PUBLIC_FIELDS = {
  cases: ['id', 'name', 'parentId', 'type', 'location', 'color'],
  objects: ['id', 'name', 'nickname', 'caseId', 'compartment', 'quantity', 'family', 'status', 'location', 'length', 'color', 'sounds', 'methods', 'photoPaths'],
  sounds: ['id', 'name', 'aliases'],
  objectSounds: ['object_id', 'sound_id', 'technique']
}
const pick = (row, keys) => Object.fromEntries(keys.filter(k => row?.[k] !== undefined && row?.[k] !== null).map(k => [k, row[k]]))
/** Défense en profondeur : même si le serveur renvoyait plus, seuls les champs d'inventaire sont gardés. */
export function sanitizePublicInventory(data = {}) {
  const out = {}
  for (const [store, keys] of Object.entries(PUBLIC_FIELDS)) out[store] = (Array.isArray(data?.[store]) ? data[store] : []).map(r => pick(r, keys))
  out.objects = out.objects.map(o => ({ ...o, methods: Array.isArray(o.methods) ? o.methods.map(m => pick(m, ['technique', 'name', 'sound'])) : undefined }))
  return out
}
export class PublicInventoryError extends Error { constructor(kind, message) { super(message); this.kind = kind } }
/** Charge l'inventaire public. Erreurs typées : not-published (RPC absente / migration non appliquée), offline, unavailable. */
export async function fetchPublicInventory({ url, key, fetchImpl = globalThis.fetch, timeoutMs = 12000 } = {}) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  let res
  try {
    res = await fetchImpl(`${url}/rest/v1/rpc/get_public_inventory`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: '{}', signal: ctrl?.signal })
  } catch { throw new PublicInventoryError('offline', 'Inventaire public injoignable (hors ligne ?)') } finally { if (timer) clearTimeout(timer) }
  if (res.status === 404) throw new PublicInventoryError('not-published', 'Inventaire public pas encore publié')
  if (!res.ok) {
    let code = ''; try { code = (await res.json())?.code || '' } catch {}
    if (code === 'PGRST202' || code === '42883') throw new PublicInventoryError('not-published', 'Inventaire public pas encore publié')
    throw new PublicInventoryError('unavailable', `Inventaire public indisponible (${res.status})`)
  }
  return sanitizePublicInventory(await res.json())
}
/** Message clair (jamais de page blanche) quand l'inventaire ou le contenant n'est pas disponible. */
export function publicNoticeHtml(kind, caseId, esc) {
  const id = caseId ? `<p class="pubId">Contenant scanné : <code>${esc(caseId)}</code></p>` : ''
  const msg = {
    'not-published': ['Inventaire pas encore publié', 'Le QR est valide, mais l’inventaire public de MISES! n’est pas encore en ligne. Il apparaîtra ici dès sa publication.'],
    'case-missing': ['Contenant pas encore publié', 'Ce contenant n’apparaît pas encore dans l’inventaire public. Il apparaîtra après la prochaine synchronisation.'],
    offline: ['Inventaire injoignable', 'Vérifie la connexion réseau puis réessaie.'],
    unavailable: ['Inventaire momentanément indisponible', 'Réessaie dans quelques minutes.']
  }[kind] || ['Inventaire indisponible', 'Réessaie plus tard.']
  return `<div class="pubEmpty pubNotice" data-testid="pub-notice" data-kind="${esc(kind)}"><h1>${msg[0]}</h1><p>${msg[1]}</p>${id}<button type="button" class="ghost" data-pub-retry>Réessayer</button></div>`
}
export function publicPhotoUrl(url, path) { return `${url}/storage/v1/object/public/mises-photos/${String(path).split('/').map(encodeURIComponent).join('/')}` }

const qty = o => o.quantity === null || o.quantity === undefined || o.quantity === '' ? '' : `<b class="pubQty">×${o.quantity}</b>`
function objectRow(o, inv, esc, photoUrl) {
  const path = o.caseId ? casePathString(o.caseId, inv.cases) : ''
  const img = o.photoPaths?.[0] && photoUrl ? `<img loading="lazy" src="${esc(photoUrl(o.photoPaths[0]))}" alt="">` : ''
  return `<li class="pubItem" data-object="${esc(o.id)}">${img}<div><span class="pubName">${esc(o.name)}</span> ${qty(o)}${o.length ? ` <small>${esc(o.length)}</small>` : ''}${path ? `<small class="pubPath">📦 ${esc(path)}</small>` : ''}</div></li>`
}
export function publicContainerHtml(inv, caseId, esc, { query = '', photoUrl = null } = {}) {
  const c = inv.cases.find(x => x.id === caseId)
  if (!c) return publicNoticeHtml(inv.cases.length ? 'case-missing' : 'not-published', caseId, esc)
  const ids = new Set([caseId, ...allDescendantCaseIds(caseId, inv.cases)])
  const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const match = o => !q || [o.name, o.nickname, o.family, o.compartment].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
  const direct = inv.objects.filter(o => o.caseId === caseId && match(o))
  const subs = directSubContainers(caseId, inv.cases)
  const total = inv.objects.filter(o => ids.has(o.caseId)).length
  return `<header class="pubHead"><small>${esc(casePathString(caseId, inv.cases))}</small><h1 data-testid="pub-title">${esc(c.name)}</h1><small>${total} objet(s)${subs.length ? ` · ${subs.length} compartiment(s)` : ''}</small></header>
  <input id="pubCaseSearch" type="search" placeholder="Chercher dans ce contenant" value="${esc(query)}" aria-label="Chercher dans ce contenant">
  <ul class="pubList" data-testid="pub-items">${direct.map(o => objectRow(o, inv, esc, photoUrl)).join('')}</ul>
  ${subs.map(s => { const items = inv.objects.filter(o => (o.caseId === s.id || allDescendantCaseIds(s.id, inv.cases).has(o.caseId)) && match(o)); return `<section class="pubSub" data-testid="pub-sub"><h2><button type="button" data-pub-case="${esc(s.id)}">📁 ${esc(s.name)}</button></h2><ul class="pubList">${items.map(o => objectRow(o, inv, esc, photoUrl)).join('')}</ul></section>` }).join('')}`
}
export function publicSearchHtml(inv, query, esc) {
  const results = centralSearch(buildCentralIndex(inv), query, 40)
  if (!query.trim()) return `<ul class="pubList">${inv.cases.filter(c => !c.parentId).map(c => `<li><button type="button" data-pub-case="${esc(c.id)}">📦 ${esc(c.name)}</button></li>`).join('')}</ul>`
  if (!results.length) return '<div class="pubEmpty">Aucun résultat.</div>'
  return `<ul class="pubList" data-testid="pub-results">${results.map(r => `<li class="pubResult" data-kind="${r.kind}">${r.kind === 'contenant' ? `<button type="button" data-pub-case="${esc(r.id)}">📦 ${esc(r.path || r.label)}</button>` : r.kind === 'objet' ? `<span class="pubName">${esc(r.label)}</span>${(() => { const o = inv.objects.find(x => x.id === r.id); return o ? ' ' + qty(o) : '' })()}${r.path ? ` <button type="button" class="pubPath" data-pub-case="${esc(inv.objects.find(x => x.id === r.id)?.caseId || '')}">📦 ${esc(r.path)}</button>` : ''}${r.techniques?.length ? `<small>✋ ${esc(r.techniques.join(', '))}</small>` : ''}` : `<span class="pubName">♪ ${esc(r.label)}</span><small>${esc((r.objects || []).map(o => o.name + (o.path ? ` (${o.path})` : '')).join(', '))}</small>`}</li>`).join('')}</ul>`
}
