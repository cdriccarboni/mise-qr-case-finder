const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://jemqozyqqsgabljnhfvn.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_NKPFAOyp7XXDDzlrLDBUeg_Btd0fIZi'

const ANDROID_AUTH_REDIRECT = 'mises://auth'
const WEB_AUTH_REDIRECT = 'https://cdriccarboni.github.io/mise-qr-case-finder/'
const isAndroidShell = () => Boolean(window.MisesAndroid) || location.hostname === 'appassets.androidplatform.net'
const authRedirectUrl = () => isAndroidShell() ? ANDROID_AUTH_REDIRECT : (location.origin === 'https://cdriccarboni.github.io' ? WEB_AUTH_REDIRECT : location.origin + location.pathname)

let clientPromise
async function loadClient(){
  if(!clientPromise){
    clientPromise = import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2.117.2')
      .then(({createClient}) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce' }
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
export async function sendSupabaseMagicLink(email){
  const supabase=await loadClient()
  const {error}=await supabase.auth.signInWithOtp({
    email:String(email).trim(),
    options:{emailRedirectTo:authRedirectUrl(),shouldCreateUser:true}
  })
  if(error) throw error
}
export async function supabaseSignOut(){
  const supabase=await loadClient()
  const {error}=await supabase.auth.signOut()
  if(error) throw error
}
