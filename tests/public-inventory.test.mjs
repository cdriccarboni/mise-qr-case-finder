import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sanitizePublicInventory, fetchPublicInventory, publicContainerHtml, publicSearchHtml } from '../src/public-inventory.js'
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const raw = {
  cases: [{ id: 'c1', name: 'Sac fictif A', owner_id: 'u1', notes: 'privé' }, { id: 'c2', name: 'Poche avant', parentId: 'c1' }, { id: 'c3', name: 'Valise fictive' }],
  objects: [{ id: 'o1', name: 'Câble XLR fictif', caseId: 'c2', quantity: 4, notes: 'secret', email: 'x@y.z', updated_by: 'u1' }, { id: 'o2', name: 'Tôle fictive', caseId: 'c3', quantity: null, methods: [{ technique: 'Secouer', secret: 1 }] }],
  members: [{ email: 'x@y.z' }]
}
test('assainissement : liste blanche, aucun champ privé', () => {
  const s = sanitizePublicInventory(raw)
  const txt = JSON.stringify(s)
  for (const bad of ['secret', 'x@y.z', 'owner_id', 'updated_by', 'privé', 'members']) assert.ok(!txt.includes(bad), bad)
  assert.equal(s.objects[0].quantity, 4)
})
test('fetch RPC anon : POST rpc/get_public_inventory avec clé publishable seulement', async () => {
  let call
  const inv = await fetchPublicInventory({ url: 'https://p.test', key: 'pk', fetchImpl: async (u, o) => { call = { u, o }; return { ok: true, json: async () => raw } } })
  assert.equal(call.u, 'https://p.test/rest/v1/rpc/get_public_inventory'); assert.equal(call.o.method, 'POST')
  assert.equal(inv.objects.length, 2)
  await assert.rejects(fetchPublicInventory({ url: 'u', key: 'k', fetchImpl: async () => ({ ok: false, status: 401 }) }), /401/)
})
test('page contenant : objets, quantités, compartiments, recherche locale', () => {
  const inv = sanitizePublicInventory(raw)
  const h = publicContainerHtml(inv, 'c1', esc)
  assert.match(h, /Poche avant/); assert.match(h, /Câble XLR fictif/); assert.match(h, /×4/)
  assert.doesNotMatch(publicContainerHtml(inv, 'c1', esc, { query: 'tole' }), /Câble XLR/)
  assert.match(publicContainerHtml(inv, 'zz', esc), /introuvable/)
})
test('recherche globale publique : objet + chemin du contenant', () => {
  const h = publicSearchHtml(sanitizePublicInventory(raw), 'xlr', esc)
  assert.match(h, /Câble XLR fictif/); assert.match(h, /Sac fictif A &#62; Poche avant|Sac fictif A > Poche avant/)
})
test('SQL : RPC security definer anon, champs en liste blanche, aucune écriture anon, aucun DROP', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261019000002_mises_public_inventory.sql', import.meta.url), 'utf8')
  const core = readFileSync(new URL('../supabase/migrations/20261019000001_mises_core.sql', import.meta.url), 'utf8')
  assert.match(sql, /security definer/); assert.match(sql, /grant execute on function public\.get_public_inventory\(\) to anon/)
  assert.match(sql, /where public_inventory/); assert.match(sql, /PRIVE_ONLY/)
  for (const f of ["'notes'", 'updated_by', 'owner_id', 'email']) assert.ok(!sql.includes(`'${f.replace(/'/g, '')}', payload`), f)
  assert.ok(!/payload->>'notes'/.test(sql))
  assert.ok(!/for (insert|update|delete|all) to anon/i.test(sql + core))
  const code = (sql + core).replace(/--.*$/gm, '')
  assert.ok(!/drop\s+(table|policy)|truncate|delete\s+from/i.test(code))
  assert.match(core, /to authenticated/)
})
