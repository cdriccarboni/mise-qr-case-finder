const ROLE_PRIORITY = { editor: 0, member: 1, viewer: 2 }
const STORAGE_PAGE_SIZE = 100
const STORAGE_REMOVE_BATCH_SIZE = 100

function valueOrThrow(result) {
  if (result?.error) throw result.error
  return result?.data ?? null
}

function storagePath(prefix, name) {
  const value = String(name || '')
  return value.startsWith(prefix) ? value : `${prefix}${value}`
}

function isStorageFolder(entry) {
  return entry?.id === null && entry?.metadata == null
}

/** Choisit le relais : editor, member, viewer, puis l'appartenance la plus ancienne. */
export function pickNewOwner(members) {
  return [...(members || [])].sort((a, b) => {
    const role = (ROLE_PRIORITY[a?.role] ?? Number.MAX_SAFE_INTEGER) - (ROLE_PRIORITY[b?.role] ?? Number.MAX_SAFE_INTEGER)
    if (role) return role
    const created = String(a?.created_at || '').localeCompare(String(b?.created_at || ''))
    if (created) return created
    return String(a?.user_id || '').localeCompare(String(b?.user_id || ''))
  })[0] || null
}

async function listStorageRecursively(storage, prefix, seen = new Set()) {
  if (seen.has(prefix)) return []
  seen.add(prefix)
  const paths = [], folders = []
  for (let offset = 0;; offset += STORAGE_PAGE_SIZE) {
    const page = valueOrThrow(await storage.list(prefix, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    })) || []
    for (const entry of page) {
      const path = storagePath(prefix, entry?.name)
      if (isStorageFolder(entry)) folders.push(`${path.replace(/\/$/, '')}/`)
      else paths.push(path)
    }
    if (page.length < STORAGE_PAGE_SIZE) break
  }
  for (const folder of folders) paths.push(...await listStorageRecursively(storage, folder, seen))
  return paths
}

async function removeStoragePrefix(admin, bucket, spaceId) {
  const storage = admin.storage.from(bucket)
  const paths = await listStorageRecursively(storage, `${spaceId}/`)
  for (let start = 0; start < paths.length; start += STORAGE_REMOVE_BATCH_SIZE) {
    valueOrThrow(await storage.remove(paths.slice(start, start + STORAGE_REMOVE_BATCH_SIZE)))
  }
  return paths.length
}

/**
 * Supprime définitivement les données cloud de l'utilisateur MISES!.
 * Le client injecté doit être un client supabase-js utilisant service_role.
 */
export async function deleteAccount(admin, user, { bucket = 'mises-photos' } = {}) {
  if (!admin?.from || !admin?.storage || !admin?.auth?.admin?.deleteUser) throw new TypeError('Client administrateur Supabase invalide')
  if (!user?.id) throw new TypeError('Utilisateur Supabase invalide')

  const userId = user.id
  const ownedSpaces = valueOrThrow(await admin.from('mises_spaces').select('id').eq('owner_id', userId)) || []
  const ownedSpaceIds = new Set(ownedSpaces.map(space => space.id))
  let deletedSpaces = 0, transferredSpaces = 0, leftSpaces = 0, removedObjects = 0

  for (const space of ownedSpaces) {
    const members = valueOrThrow(await admin.from('mises_memberships').select('user_id,role,created_at').eq('space_id', space.id)) || []
    const remaining = members.filter(member => member.user_id !== userId)
    if (!remaining.length) {
      removedObjects += await removeStoragePrefix(admin, bucket, space.id)
      valueOrThrow(await admin.from('mises_spaces').delete().eq('id', space.id))
      deletedSpaces += 1
      continue
    }
    const newOwner = pickNewOwner(remaining)
    if (!newOwner?.user_id) throw new Error(`Aucun membre disponible pour reprendre l’espace ${space.id}`)
    valueOrThrow(await admin.from('mises_spaces').update({ owner_id: newOwner.user_id }).eq('id', space.id))
    valueOrThrow(await admin.from('mises_memberships').update({ role: 'owner' }).eq('space_id', space.id).eq('user_id', newOwner.user_id))
    transferredSpaces += 1
  }

  const memberships = valueOrThrow(await admin.from('mises_memberships').select('space_id').eq('user_id', userId)) || []
  for (const membership of memberships) {
    if (ownedSpaceIds.has(membership.space_id)) continue
    valueOrThrow(await admin.from('mises_memberships').delete().eq('space_id', membership.space_id).eq('user_id', userId))
    leftSpaces += 1
  }

  // Ces deux FK n'ont pas encore ON DELETE SET NULL en production : nettoyer avant Auth.
  valueOrThrow(await admin.from('mises_records').update({ updated_by: null }).eq('updated_by', userId))
  valueOrThrow(await admin.from('mises_assets').update({ created_by: null }).eq('created_by', userId))
  // Égalité exacte en minuscules (comme mises_claim_owner_seeds) : pas de ilike, « _ » et « % » sont des jokers.
  if (user.email) valueOrThrow(await admin.from('mises_owner_seeds').delete().eq('email', String(user.email).trim().toLowerCase()))
  valueOrThrow(await admin.auth.admin.deleteUser(userId))

  return { ok: true, deletedSpaces, transferredSpaces, leftSpaces, removedObjects }
}
