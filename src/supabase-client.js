const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://errsklrioqfovhkdiejd.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_qbnK4af5P24uDmmmIYUhWg_nN-iGWgC'
const SUPABASE_EMAIL_REDIRECT_URL = import.meta.env?.VITE_SUPABASE_EMAIL_REDIRECT_URL || 'https://cdriccarboni.github.io/mise-qr-case-finder/'

let clientPromise
async function loadClient(){
  if(!clientPromise){
    clientPromise = import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2.117.2')
      .then(({createClient}) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:false, flowType:'pkce' }
      }))
  }
  return clientPromise
}
export async function supabaseClient(){ return loadClient() }
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

export async function supabaseSession(){
  if(!supabaseConfigured) return null
  const supabase = await loadClient()
  const {data,error}=await supabase.auth.getSession()
  if(error) throw error
  return data.session||null
}
export async function supabaseUser(){
  const session=await supabaseSession()
  return session?.user||null
}
/** Retour d'authentification : schéma de l'app Android (capté par MainActivity), sinon la PWA publique. */
export const SUPABASE_APP_REDIRECT_URL = 'fr.acousmatictheatre.mises://auth-callback'
export function authRedirectUrl(win = globalThis.window){
  return win?.MisesAndroid && typeof win.MisesAndroid.openAuthUrl === 'function' ? SUPABASE_APP_REDIRECT_URL : SUPABASE_EMAIL_REDIRECT_URL
}
/** Normalise une adresse saisie au clavier mobile : NFKC, invisibles retirés, espaces, minuscules. */
export function normalizeEmail(raw){
  return String(raw??'').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]/g,'').replace(/\s+/g,'').toLowerCase()
}
const EMAIL_RE=/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/
export function validateEmail(raw){
  const email=normalizeEmail(raw)
  const ok=EMAIL_RE.test(email)&&!email.includes('..')&&email.length<=254
  return {ok,email,message:ok?'':`Adresse refusée : « ${String(raw??'').trim()} ». Vérifie qu’il n’y a ni accent, ni espace, ni caractère en trop (format nom@domaine.fr).`}
}
/** Erreurs Supabase Auth → messages français clairs. */
export function authErrorMessage(error){
  const m=String(error?.message||error||'').toLowerCase(), code=String(error?.code||'').toLowerCase()
  if(code==='password_missing_local')return 'Entre ton mot de passe.'
  if(code==='invalid_credentials'||/invalid login credentials/.test(m))return 'E-mail ou mot de passe incorrect.'
  if(/invalid format|validate email|email_address_invalid/.test(m+code))return 'Adresse e-mail refusée : vérifie qu’il n’y a ni accent, ni espace.'
  if(/provider is not enabled|unsupported provider/.test(m))return 'La connexion Google n’est pas activée. Utilise le lien par e-mail.'
  if(/rate limit|too many|over_email_send_rate|429/.test(m+code))return 'Trop de demandes : attends quelques minutes avant de redemander un lien.'
  if(/expired|invalid.*(otp|token|link)|otp_expired/.test(m+code))return 'Lien expiré ou déjà utilisé : redemande un nouveau lien.'
  if(/code verifier|pkce|flow state/.test(m))return 'Ouvre le lien sur l’appareil où tu l’as demandé (même app ou même navigateur).'
  if(/signups not allowed|signup.*disabled/.test(m))return 'Les inscriptions sont fermées pour l’instant.'
  if(/redirect/.test(m))return 'Adresse de retour non autorisée dans Supabase (configuration des URL de redirection).'
  if(/failed to fetch|network|load failed/.test(m))return 'Pas de connexion réseau : réessaie quand tu es en ligne.'
  return 'Connexion impossible pour le moment. Réessaie dans quelques minutes.'
}
/** Fournisseur Google activé ? (GET /auth/v1/settings, clé publiable) — désactivé par défaut. */
export async function googleProviderEnabled(fetchImpl=globalThis.fetch){
  try{const r=await fetchImpl(`${SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});if(!r.ok)return false;return (await r.json())?.external?.google===true}catch{return false}
}
export async function sendSupabaseMagicLink(raw){
  const v=validateEmail(raw)
  if(!v.ok) throw Object.assign(new Error(v.message),{code:'email_invalid_local'})
  const supabase=await loadClient()
  const {error}=await supabase.auth.signInWithOtp({
    email:v.email,
    options:{emailRedirectTo:authRedirectUrl(),shouldCreateUser:true}
  })
  if(error) throw error
}
export async function signInWithSupabasePassword(rawEmail,password){
  const v=validateEmail(rawEmail)
  if(!v.ok) throw Object.assign(new Error(v.message),{code:'email_invalid_local'})
  if(typeof password!=='string'||password.length===0) throw Object.assign(new Error('Entre ton mot de passe.'),{code:'password_missing_local'})
  const supabase=await loadClient()
  const {data,error}=await supabase.auth.signInWithPassword({email:v.email,password})
  if(error) throw error
  return data.session
}
/** Google via Supabase : Custom Tab sur Android (Google refuse les WebView), redirection normale en PWA. */
export async function signInWithGoogleSupabase(){
  const supabase=await loadClient()
  const android=authRedirectUrl()===SUPABASE_APP_REDIRECT_URL
  const {data,error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirectUrl(),skipBrowserRedirect:android}})
  if(error) throw error
  if(android&&data?.url) window.MisesAndroid.openAuthUrl(data.url)
}
/** Lit ?code= (PKCE) ou #access_token / ?error_description dans l'URL de retour. */
export function parseAuthReturn(href){
  let u;try{u=new URL(href)}catch{return null}
  const hash=new URLSearchParams(u.hash.replace(/^#/,''))
  const get=k=>u.searchParams.get(k)||hash.get(k)
  if(get('error_description')||get('error')) return {error:get('error_description')||get('error')}
  if(get('code')) return {code:get('code')}
  if(hash.get('access_token')&&hash.get('refresh_token')) return {access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')}
  return null
}
export function cleanAuthUrl(href){
  const u=new URL(href);for(const k of ['code','error','error_code','error_description','state'])u.searchParams.delete(k)
  if(/access_token|error_description/.test(u.hash))u.hash='';return u.toString()
}
/** Termine la connexion dans l'app : échange le code PKCE (vérificateur conservé dans CE stockage). */
export async function completeSupabaseAuthFromUrl(href, client){
  const ret=parseAuthReturn(href)
  if(!ret) return {handled:false}
  if(ret.error) throw new Error(ret.error)
  const supabase=client||await loadClient()
  const {data,error}=ret.code?await supabase.auth.exchangeCodeForSession(ret.code):await supabase.auth.setSession(ret)
  if(error) throw error
  return {handled:true,session:data?.session||null}
}
export async function supabaseSignOut(){
  const supabase=await loadClient()
  const {error}=await supabase.auth.signOut()
  if(error) throw error
}
export async function deleteSupabaseAccount(client){
  const supabase=client||await loadClient()
  const {data:sessionData,error:sessionError}=await supabase.auth.getSession()
  if(sessionError||!sessionData?.session) throw new Error('Connecte-toi avant de supprimer ton compte.')
  const {error}=await supabase.functions.invoke('delete-account',{body:{confirm:'SUPPRIMER'}})
  if(error) throw new Error('Suppression du compte impossible pour le moment. Réessaie dans quelques minutes.')
  await supabase.auth.signOut({scope:'local'})
}
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY }
