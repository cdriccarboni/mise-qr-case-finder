import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { archiveCase, restoreCase, deleteCase, canDeleteCase, activeLabelCases, archivedLabelCases } from '../src/label-archive.js'
import { containerQrUrl } from '../src/label-render.js'
import { claimOwnerSeed } from '../src/sync-core.js'

const T = '2026-10-20T10:00:00.000Z'
test('archiver garde ID et QR, masque de la liste ; Archivées permet de restaurer', () => {
  const c = { id: 'CASE-USER-1', name: 'Boîte', updatedAt: '2026-01-01T00:00:00Z' }
  const a = archiveCase(c, T)
  assert.equal(a.id, c.id); assert.equal(containerQrUrl(a.id), containerQrUrl(c.id)); assert.equal(a.updatedAt, T, 'daté → poussé à la synchro')
  assert.deepEqual(activeLabelCases([a]), []); assert.deepEqual(archivedLabelCases([a]).map(x => x.id), [c.id])
  const r = restoreCase(a, T); assert.deepEqual(activeLabelCases([r]).map(x => x.id), [c.id]); assert.equal(r.archivedAt, undefined)
})
test('contenant protégé (seed propriétaire) : archivable, jamais supprimable', () => {
  const p = { id: 'CASE-SEED', name: 'X', protected: true }
  assert.equal(archiveCase(p, T).labelState, 'archived')
  assert.equal(canDeleteCase(p).ok, false); assert.throws(() => deleteCase(p, [], T), /protégé/)
})
test('API legacy : protège le contenant non vide ; l’UI emploie la purge réelle', () => {
  const c = { id: 'CASE-TEST', name: 'Test' }
  assert.throws(() => deleteCase(c, [{ id: 'o', caseId: 'CASE-TEST' }], T), /non vide/)
  const d = deleteCase(c, [], T)
  assert.equal(d.labelState, 'deleted'); assert.equal(d.name, 'Test')
  const main = readFileSync('src/main.js', 'utf8')
  assert.match(main, /await deleteLocalRecord\(db,'cases',c\.id\)/)
  assert.match(main, /await deleteLocalRecord\(db,last\.store,last\.id\)/)
})
test('seed owner-only : appel RPC idempotent, silencieux sans seed ni réseau', async () => {
  const calls = []
  assert.equal(await claimOwnerSeed({ rpc: async n => { calls.push(n); return { data: 6, error: null } } }), 6)
  assert.equal(await claimOwnerSeed({ rpc: async () => ({ data: null, error: { message: 'x' } }) }), 0)
  assert.equal(await claimOwnerSeed({ rpc: async () => { throw new Error('offline') } }), 0)
  assert.deepEqual(calls, ['mises_claim_owner_seed'])
  const sync = readFileSync('src/sync-core.js', 'utf8'); assert.match(sync, /ensurePersonalSpace\(supabase,session\.user\)\n[^]*?await claimOwnerSeed\(supabase\)/)
})
test('migration seed : idempotente, RLS sans policy, aucune donnée privée, jamais d’écrasement', () => {
  const sql = readFileSync('supabase/migrations/20261020000001_mises_owner_seed_archive.sql', 'utf8')
  assert.match(sql, /create table if not exists public\.mises_owner_seeds/)
  assert.match(sql, /enable row level security/); assert.doesNotMatch(sql, /create policy/i)
  assert.match(sql, /on conflict \(space_id, store_name, record_id\) do nothing/)
  assert.match(sql, /email_confirmed_at is not null/); assert.doesNotMatch(sql, /insert into public\.mises_owner_seeds/i)
  assert.doesNotMatch(sql, /service_role/i)
})
// Confidentialité : aucun nom/ID des sacs du propriétaire dans le code public (src, public, tests, dist).
const PRIVATE = process.env.MISES_PRIVATE_LABELS || '/workspace/mises-private/approved-labels.json'
test('aucun contenant privé dans le code ou le bundle public', { skip: !existsSync(PRIVATE) && 'liste privée absente' }, () => {
  const secrets = JSON.parse(readFileSync(PRIVATE, 'utf8')).flatMap(c => [c.id, c.name])
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])
  const files = ['src', 'public', 'android/app/src', ...(existsSync('dist') ? ['dist'] : [])].flatMap(walk).filter(f => /\.(js|mjs|json|html|java|kt|xml|css|webmanifest)$/.test(f))
  for (const f of files) { const t = readFileSync(f, 'utf8'); for (const s of secrets) assert.ok(!t.includes(s), `${s} présent dans ${f}`) }
})
