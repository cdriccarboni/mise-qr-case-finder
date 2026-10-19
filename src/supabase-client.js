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
export async function sendSupabaseMagicLink(email){
  const supabase=await loadClient()
  const {error}=await supabase.auth.signInWithOtp({
    email:String(email).trim(),
    options:{emailRedirectTo:authRedirectUrl(),shouldCreateUser:true}
  })
  if(error) throw error
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
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY }
