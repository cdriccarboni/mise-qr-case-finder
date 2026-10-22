import { createClient } from 'npm:@supabase/supabase-js@2'
import { deleteAccount } from './core.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } })
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  const authorization = request.headers.get('Authorization') || ''
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ error: 'Authentification requise.' }, 401)

  let body: { confirm?: unknown }
  try { body = await request.json() } catch { return json({ error: 'Corps JSON invalide.' }, 400) }
  if (body?.confirm !== 'SUPPRIMER') return json({ error: 'Confirmation SUPPRIMER requise.' }, 400)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) return json({ error: 'Configuration de suppression indisponible.' }, 500)

  const verifier = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data, error } = await verifier.auth.getUser()
  if (error || !data.user) return json({ error: 'Authentification invalide ou expirée.' }, 401)

  try {
    const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    return json(await deleteAccount(admin, data.user))
  } catch (err) {
    console.error('delete-account failed', (err as Error)?.message || String(err))
    return json({ error: 'Suppression du compte impossible pour le moment. Réessaie dans quelques minutes.' }, 500)
  }
})
