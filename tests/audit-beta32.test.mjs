import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { publicNoticeHtml, publicContainerHtml } from '../src/public-inventory.js'
const esc = s => String(s)
const main = readFileSync('src/main.js', 'utf8')

test('P0 page publique : jamais « QR valide » ; inconnu ≠ non publié ; hors ligne distinct', () => {
  for (const k of ['not-published', 'case-missing', 'offline', 'unavailable']) assert.doesNotMatch(publicNoticeHtml(k, 'ZZZ999', esc), /valide/i)
  assert.match(publicContainerHtml({ cases: [{ id: 'A', name: 'A' }], objects: [] }, 'ZZZ999', esc), /data-kind="case-missing"[^]*Contenant inconnu/)
  assert.match(publicContainerHtml({ cases: [], objects: [] }, 'ZZZ999', esc), /data-kind="not-published"[^]*Inventaire non publié/)
  assert.match(publicNoticeHtml('unavailable', '', esc, { online: false }), /data-kind="offline"[^]*Hors ligne/)
  assert.doesNotMatch(publicNoticeHtml('not-published', 'X', esc), /<b>|nom/i)
})
test('P0 page publique autonome (sans shell propriétaire) + retour libellé', () => {
  assert.match(main, /const standalone=Boolean\(params\.get\('case'\)\)&&!caseBy\(caseId\)/)
  assert.match(readFileSync('src/style.css', 'utf8'), /body\.pubStandalone>\*:not\(#publicInventory\)\{display:none!important\}/)
  assert.match(main, /aria-label="Retour à mon application">← Retour/)
})
test('P0 publication : opt-in propriétaire (public_inventory) + RPC anon limitée aux espaces publiés', () => {
  assert.match(readFileSync('src/sync-core.js', 'utf8'), /update\(\{public_inventory:Boolean\(published\)\}\)\.eq\('id',spaceId\)\.eq\('owner_id',session\.user\.id\)/)
  const sql = readFileSync('supabase/migrations/20261019000002_mises_public_inventory.sql', 'utf8')
  assert.match(sql, /where public_inventory/); assert.match(sql, /grant execute on function public\.get_public_inventory\(\) to anon/)
  assert.match(main, /id="publishInventory"/)
})
test('Étiquettes : état vide sans actions actives, CTA, Supprimer dans ⋯, sous-titre sans jargon', () => {
  assert.match(main, /archived\|\|!sorted\.length\?'':'<div class="row labelsBar"><button id="printSelected"/)
  assert.match(main, /data-testid="labels-create-case">Créer un contenant/)
  assert.match(main, /<details class="moreMenu"><summary aria-label="Plus d’actions[^]*data-delete-one/)
  assert.match(main, /<small>Étiquette 48 mm · QR permanent<\/small>/)
  assert.doesNotMatch(main, /384 pts\) · longueur|raster envoyé|IMPRIMER|ÉTIQUETTES/)
})
test('Accueil : MISES! seul, version une fois, parcours cœur d’abord, outils secondaires groupés, onboarding', () => {
  assert.doesNotMatch(main, /<div class="sub">QR CASE FINDER<\/div>/)
  assert.equal((main.match(/\$\{APP_VERSION\}<\/span>/g) || []).length, 1)
  assert.ok(main.indexOf('data-action="new-case"') < main.indexOf('data-action="quick-add"') && main.indexOf('data-action="quick-add"') < main.indexOf('data-testid="home-labels"'))
  assert.match(main, /<details class="moreShortcuts"/); assert.match(main, /<details class="secondaryTools"><summary>Ambiances & jeux/)
  for (const t of ['data-tab="halloween"', 'data-tab="creator"', 'data-tab="vibe"', 'data-action="case-photo"', 'data-action="voice-label"']) assert.ok(main.includes(t), `${t} conservé`)
  assert.match(main, /id="onboarding"[^]*☁ Se connecter[^]*Créer mon premier contenant/)
  assert.match(main, /aria-label="Préférences" title="Préférences">⚙<span class="iconLabel">/)
})
test('P2 : data.json public sans contenants ni objets ; code mort retiré', () => {
  const data = JSON.parse(readFileSync('public/data.json', 'utf8'))
  assert.equal((data.containers || []).length, 0); assert.equal((data.cases || []).length, 0); assert.equal((data.objects || []).length, 0)
  for (const f of ['src/counter.js', 'src/assets/vite.svg', 'src/assets/javascript.svg']) assert.ok(!existsSync(f), f)
})
