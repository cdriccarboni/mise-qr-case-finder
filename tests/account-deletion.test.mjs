import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { indexedDB as fakeIndexedDB } from 'fake-indexeddb'
import { deleteAccount, pickNewOwner } from '../supabase/functions/delete-account/core.js'
import { deleteSupabaseAccount } from '../src/supabase-client.js'
import { clearLocalAppData, confirmPhraseOk } from '../src/account-deletion.js'

const USER = { id: 'user-1', email: 'Compte@MISES.fr' }

function response(data = null, error = null) { return { data, error } }

function fakeAdmin({ owned = [], memberships = {}, userMemberships = [], files = {}, fail } = {}) {
  const calls = []
  const execute = query => {
    calls.push({ ...query, filters: { ...query.filters }, values: query.values && { ...query.values } })
    if (fail?.(query)) return response(null, new Error('échec volontaire'))
    if (query.type === 'select' && query.table === 'mises_spaces') return response(owned.map(id => ({ id })))
    if (query.type === 'select' && query.table === 'mises_memberships') {
      if (query.filters.space_id) return response(memberships[query.filters.space_id] || [])
      if (query.filters.user_id) return response(userMemberships)
    }
    return response()
  }
  const admin = {
    calls,
    from(table) {
      const query = { table, type: 'select', filters: {}, values: null }
      const chain = {
        select() { query.type = 'select'; return chain },
        update(values) { query.type = 'update'; query.values = values; return chain },
        delete() { query.type = 'delete'; return chain },
        eq(column, value) { query.filters[column] = value; return chain },
        ilike(column, value) { query.filters[`ilike:${column}`] = value; return chain },
        then(resolve, reject) { return Promise.resolve(execute(query)).then(resolve, reject) }
      }
      return chain
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, 'mises-photos')
        return {
          async list(prefix, options) {
            calls.push({ table: 'storage', type: 'list', prefix, options })
            const entries = files[prefix] || []
            const page = entries.slice(options.offset, options.offset + options.limit)
            return response(page)
          },
          async remove(paths) {
            calls.push({ table: 'storage', type: 'remove', paths })
            return response(paths.map(name => ({ name })))
          }
        }
      }
    },
    auth: { admin: { async deleteUser(id) { calls.push({ table: 'auth', type: 'deleteUser', id }); return response({ user: { id } }) } } }
  }
  return admin
}

test('pickNewOwner préfère editor puis la plus ancienne appartenance', () => {
  const next = pickNewOwner([
    { user_id: 'viewer-old', role: 'viewer', created_at: '2020-01-01T00:00:00Z' },
    { user_id: 'member-old', role: 'member', created_at: '2020-01-01T00:00:00Z' },
    { user_id: 'editor-new', role: 'editor', created_at: '2024-01-01T00:00:00Z' },
    { user_id: 'editor-old', role: 'editor', created_at: '2021-01-01T00:00:00Z' }
  ])
  assert.equal(next.user_id, 'editor-old')
})

test('suppression : espace seul, Storage récursif, anonymisation, seeds puis Auth en dernier', async () => {
  const admin = fakeAdmin({
    owned: ['solo'],
    memberships: { solo: [{ user_id: USER.id, role: 'owner', created_at: '2020-01-01T00:00:00Z' }] },
    userMemberships: [{ space_id: 'solo', role: 'owner' }],
    files: {
      'solo/': [{ name: 'cover.jpg', id: 'cover', metadata: {} }, { name: 'objects', id: null, metadata: null }],
      'solo/objects/': [{ name: 'photo.jpg', id: 'photo', metadata: {} }]
    }
  })
  const result = await deleteAccount(admin, USER)
  assert.deepEqual(result, { ok: true, deletedSpaces: 1, transferredSpaces: 0, leftSpaces: 0, removedObjects: 2 })
  assert.deepEqual(admin.calls.find(call => call.table === 'storage' && call.type === 'remove').paths.sort(), ['solo/cover.jpg', 'solo/objects/photo.jpg'])
  assert.ok(admin.calls.some(call => call.table === 'mises_records' && call.type === 'update' && call.values.updated_by === null))
  assert.ok(admin.calls.some(call => call.table === 'mises_assets' && call.type === 'update' && call.values.created_by === null))
  assert.ok(admin.calls.some(call => call.table === 'mises_owner_seeds' && call.type === 'delete' && call.filters.email === USER.email.toLowerCase()))
  assert.equal(admin.calls.at(-1).type, 'deleteUser')
})

test('suppression : objets Storage paginés puis retirés par lots', async () => {
  const files = Array.from({ length: 101 }, (_, index) => ({ name: `photo-${index}.jpg`, id: String(index), metadata: {} }))
  const admin = fakeAdmin({
    owned: ['solo'],
    memberships: { solo: [{ user_id: USER.id, role: 'owner' }] },
    files: { 'solo/': files }
  })
  const result = await deleteAccount(admin, USER)
  assert.equal(result.removedObjects, 101)
  assert.deepEqual(admin.calls.filter(call => call.table === 'storage' && call.type === 'list').map(call => call.options.offset), [0, 100])
  assert.deepEqual(admin.calls.filter(call => call.table === 'storage' && call.type === 'remove').map(call => call.paths.length), [100, 1])
})

test('suppression : espace partagé détenu transféré à un editor', async () => {
  const admin = fakeAdmin({
    owned: ['team'],
    memberships: { team: [
      { user_id: USER.id, role: 'owner', created_at: '2020-01-01T00:00:00Z' },
      { user_id: 'member', role: 'member', created_at: '2019-01-01T00:00:00Z' },
      { user_id: 'editor', role: 'editor', created_at: '2025-01-01T00:00:00Z' }
    ] },
    userMemberships: [{ space_id: 'team', role: 'owner' }]
  })
  const result = await deleteAccount(admin, USER)
  assert.equal(result.transferredSpaces, 1)
  assert.ok(admin.calls.some(call => call.table === 'mises_spaces' && call.type === 'update' && call.values.owner_id === 'editor' && call.filters.id === 'team'))
  assert.ok(admin.calls.some(call => call.table === 'mises_memberships' && call.type === 'update' && call.values.role === 'owner' && call.filters.user_id === 'editor'))
  assert.equal(admin.calls.some(call => call.table === 'mises_spaces' && call.type === 'delete'), false)
})

test('suppression : espace partagé non détenu, accès retiré', async () => {
  const admin = fakeAdmin({ userMemberships: [{ space_id: 'team', role: 'viewer' }] })
  const result = await deleteAccount(admin, USER)
  assert.equal(result.leftSpaces, 1)
  assert.ok(admin.calls.some(call => call.table === 'mises_memberships' && call.type === 'delete' && call.filters.space_id === 'team' && call.filters.user_id === USER.id))
})

test('une erreur antérieure est propagée et Auth.deleteUser ne démarre pas', async () => {
  const admin = fakeAdmin({ owned: ['broken'], fail: query => query.table === 'mises_memberships' && query.type === 'select' && query.filters.space_id === 'broken' })
  await assert.rejects(deleteAccount(admin, USER), /échec volontaire/)
  assert.equal(admin.calls.some(call => call.type === 'deleteUser'), false)
})

test('client : compte requis, appel confirmé, erreur sans déconnexion, succès avec déconnexion locale', async () => {
  await assert.rejects(deleteSupabaseAccount({ auth: { getSession: async () => response({ session: null }) } }), /Connecte-toi/)
  const failed = { auth: { getSession: async () => response({ session: { user: USER } }), signOut: async () => assert.fail('signOut ne doit pas être appelé') }, functions: { invoke: async () => response(null, new Error('edge failed')) } }
  await assert.rejects(deleteSupabaseAccount(failed), /Suppression du compte impossible/)
  const calls = []
  const ok = { auth: { getSession: async () => response({ session: { user: USER } }), signOut: async options => { calls.push(['signOut', options]); return response() } }, functions: { invoke: async (name, options) => { calls.push(['invoke', name, options]); return response({ ok: true }) } } }
  await deleteSupabaseAccount(ok)
  assert.deepEqual(calls, [['invoke', 'delete-account', { body: { confirm: 'SUPPRIMER' } }], ['signOut', { scope: 'local' }]])
})

class MemoryStorage {
  constructor(entries = {}) { this.entries = new Map(Object.entries(entries)) }
  get length() { return this.entries.size }
  key(index) { return [...this.entries.keys()][index] || null }
  removeItem(key) { this.entries.delete(key) }
  getItem(key) { return this.entries.get(key) || null }
  setItem(key, value) { this.entries.set(key, String(value)) }
}

function createDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = fakeIndexedDB.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('rows')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { request.result.close(); resolve() }
  })
}

test('effacement local : IndexedDB, clés MISES et caches de l’application', async () => {
  await createDatabase('mises-db'); await createDatabase('mise-db')
  const localStorage = new MemoryStorage({ 'mises-ink': '#111', 'mise-theme-mode': 'dark', 'art-mises-project-v1:x': '{}', 'sb-project-auth-token': 'secret', 'other-app': 'keep' })
  const sessionStorage = new MemoryStorage({ 'mises-google-oauth-session-v1': '{}', 'sb-project-auth-token': 'secret', 'other-session': 'keep' })
  const deletedCaches = []
  const caches = { keys: async () => ['mises-precache', 'other-cache'], delete: async key => { deletedCaches.push(key); return true } }
  const result = await clearLocalAppData({ indexedDB: fakeIndexedDB, localStorage, sessionStorage, caches })
  assert.deepEqual(result.deletedDatabases.sort(), ['mise-db', 'mises-db'])
  assert.equal(localStorage.getItem('other-app'), 'keep')
  assert.equal(sessionStorage.getItem('other-session'), 'keep')
  assert.equal(localStorage.length, 1); assert.equal(sessionStorage.length, 1)
  assert.deepEqual(deletedCaches, ['mises-precache'])
  assert.equal(confirmPhraseOk(' SUPPRIMER '), true)
  assert.equal(confirmPhraseOk('supprimer'), true)
  assert.equal(confirmPhraseOk('SUPPRIME'), false)
})

test('contrat public : page de suppression, politique Supabase et action de compte', () => {
  assert.equal(existsSync('public/delete-account.html'), true)
  const deletion = readFileSync('public/delete-account.html', 'utf8')
  const privacy = readFileSync('public/privacy.html', 'utf8')
  const main = readFileSync('src/main.js', 'utf8')
  assert.match(deletion, /cdric\.carboni@gmail\.com/)
  assert.match(deletion, /Supprimer mon compte/)
  assert.match(privacy, /Supabase/)
  assert.match(privacy, /delete-account\.html/)
  assert.match(main, /Supprimer mon compte/)
})
