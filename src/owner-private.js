/** Compte propriétaire autorisé pour le corpus Data Bruitage privé (sync Supabase). */
export const OWNER_PRIVATE_EMAIL = 'cdric.carboni@gmail.com'

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function isOwnerPrivateAccount(email) {
  return normalizeEmail(email) === normalizeEmail(OWNER_PRIVATE_EMAIL)
}

/** Garde client : le pack privé ne doit être poussé/tiré que pour le compte propriétaire. */
export function assertOwnerPrivateSync(session) {
  const email = session?.user?.email
  if (!isOwnerPrivateAccount(email)) {
    const err = new Error(`Corpus privé réservé à ${OWNER_PRIVATE_EMAIL}`)
    err.code = 'owner-private-forbidden'
    throw err
  }
  return true
}
