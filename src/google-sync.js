import { LOCAL_KEYS, SESSION_TOKEN_KEY } from './storage.js'

const ART_TOKEN_KEY='art-google-oauth-session-v1'
const GOOGLE_CLIENT_META='mises-google-client-id'
const GOOGLE_GRANT_STATE='mises-google-oauth-grant-v1'
export const DRIVE_FOLDER_NAME='MISES !'
export const LEGACY_DRIVE_FOLDER_NAME='MISE !'
export const DRIVE_STATE_NAME='mises-data.json'
export const LEGACY_DRIVE_STATE_NAME='mise-data.json'
// drive.file ne liste que les fichiers créés ou ouverts par l’app.
// La synchro cherche un dossier « _ART » déjà présent (par nom) et un partage s’ouvre par identifiant :
// ces deux lectures échouent avec drive.file, donc le scope complet reste en place.
export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive'
export const GOOGLE_SCOPES=`openid email profile ${DRIVE_SCOPE}`
export const ANDROID_GOOGLE_SIGNIN_MESSAGE='La connexion Google n’est pas disponible dans l’application Android : Google bloque l’identification dans la fenêtre intégrée. Tu peux continuer sans compte. Tes objets, photos et mémos restent sur l’appareil. Exporte une sauvegarde depuis Partager, ou ouvre MISES! dans Chrome pour synchroniser ton propre Google Drive.'
const FOLDER_MIME='application/vnd.google-apps.folder'
const GOOGLE_PRODUCTION_CLIENT_ID=String.fromCharCode(50,51,52,54,53,55,55,57,57,48,52,57,45,109,57,112,53,97,112,98,106,101,57,110,117,114,117,109,56,110,100,104,118,100,114,56,111,104,54,107,103,49,98,100,117,46,97,112,112,115,46,103,111,111,103,108,101,117,115,101,114,99,111,110,116,101,110,116,46,99,111,109)

let gisPromise=null

function q(value){return String(value||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
function validClientId(value){return /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(String(value||'').trim())}

function readStoredSession(key){
  try{
    const saved=JSON.parse(sessionStorage.getItem(key)||'null')
    if(!saved?.token||!saved.expiresAt||saved.expiresAt<Date.now()+60000)return null
    if(!String(saved.scope||'').split(/\s+/).includes(DRIVE_SCOPE))return null
    return saved
  }catch{return null}
}

export function androidGoogleSignInBlocked(){
  try{
    const bridge=globalThis.MisesAndroid
    return Boolean(bridge&&typeof bridge.googleSignInAvailable==='function'&&bridge.googleSignInAvailable()===false)
  }catch{return false}
}

export function googleSignInUnavailableMessage(){
  try{
    const bridge=globalThis.MisesAndroid
    if(bridge&&typeof bridge.googleSignInMessage==='function'){
      const text=String(bridge.googleSignInMessage()||'').trim()
      if(text)return text
    }
  }catch{}
  return ANDROID_GOOGLE_SIGNIN_MESSAGE
}

export function artGoogleSession(){
  if(androidGoogleSignInBlocked())return null
  return readStoredSession(SESSION_TOKEN_KEY)||readStoredSession(ART_TOKEN_KEY)
}

function productionClientId(){
  if(typeof location==='undefined')return ''
  const host=String(location.hostname||'').replace(/\.$/,'')
  return host==='cdriccarboni.github.io'?GOOGLE_PRODUCTION_CLIENT_ID:''
}
function directClientId(){
  const meta=typeof document!=='undefined'?document.querySelector(`meta[name="${GOOGLE_CLIENT_META}"]`)?.content||'':''
  const deployed=validClientId(meta)?meta.trim():productionClientId()
  if(deployed){try{localStorage.removeItem(LOCAL_KEYS.googleClientId)}catch{};return deployed}
  try{const local=localStorage.getItem(LOCAL_KEYS.googleClientId)||'';if(validClientId(local))return local.trim()}catch{}
  return ''
}
function scopeSet(scope){return new Set(String(scope||'').split(/\s+/).map(x=>x.trim()).filter(Boolean))}
export function googleOAuthPreviouslyGranted(scope=DRIVE_SCOPE){
  try{const saved=JSON.parse(localStorage.getItem(GOOGLE_GRANT_STATE)||'null'),granted=scopeSet(saved?.scope||'');return [...scopeSet(scope)].every(value=>granted.has(value))}catch{return false}
}
function rememberGrantScope(scope){try{localStorage.setItem(GOOGLE_GRANT_STATE,JSON.stringify({scope:String(scope||GOOGLE_SCOPES),grantedAt:new Date().toISOString()}))}catch{}}
function googleOAuthUserMessage(error='',description=''){
  const code=String(error||'').toLowerCase(),detail=String(description||'').toLowerCase()
  if(code==='invalid_client'||code==='deleted_client'||detail.includes('deleted_client')||detail.includes('oauth client was deleted'))return'Connexion Google temporairement indisponible côté MISES !. Aucun réglage à faire sur cet appareil : le client Google du service doit être réactivé.'
  if(code==='origin_mismatch'||code==='redirect_uri_mismatch'||detail.includes('origin_mismatch')||detail.includes('redirect_uri_mismatch'))return'Connexion Google temporairement indisponible côté MISES !. Aucun réglage à faire sur cet appareil : le domaine public MISES ! doit être autorisé côté Google.'
  if(code==='access_denied')return'Autorisation Google refusée.'
  return description||error||'Connexion Google impossible'
}
async function ensureGoogleIdentity(){
  if(globalThis.google?.accounts?.oauth2)return globalThis.google
  if(gisPromise)return gisPromise
  gisPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-mises-google-identity]')
    if(existing){
      existing.addEventListener('load',()=>resolve(globalThis.google),{once:true})
      existing.addEventListener('error',()=>reject(new Error('Chargement Google impossible')),{once:true})
      return
    }
    const script=document.createElement('script')
    script.src='https://accounts.google.com/gsi/client'
    script.async=true
    script.defer=true
    script.dataset.misesGoogleIdentity='1'
    script.onload=()=>resolve(globalThis.google)
    script.onerror=()=>reject(new Error('Chargement Google impossible'))
    document.head.appendChild(script)
  }).finally(()=>{gisPromise=null})
  return gisPromise
}

export async function requestGoogleSession(options={}){
  if(androidGoogleSignInBlocked())throw new Error(googleSignInUnavailableMessage())
  const current=artGoogleSession()
  if(current)return current
  const clientId=directClientId()
  if(!validClientId(clientId))throw new Error('Connexion Google MISES! non configurée')
  const googleApi=await ensureGoogleIdentity()
  if(!googleApi?.accounts?.oauth2)throw new Error('Google Identity indisponible')
  return await new Promise((resolve,reject)=>{
    let settled=false
    const done=(fn,value)=>{if(settled)return;settled=true;fn(value)}
    const client=googleApi.accounts.oauth2.initTokenClient({
      client_id:clientId,scope:GOOGLE_SCOPES,
      callback:response=>{
        if(response?.error){done(reject,new Error(googleOAuthUserMessage(response.error,response.error_description)));return}
        const expiresIn=Math.max(60,Number(response?.expires_in)||3600)
        const session={token:response.access_token,scope:response.scope||GOOGLE_SCOPES,expiresAt:Date.now()+expiresIn*1000,source:options.fromArt?'art-continuity':'mises-direct'}
        try{sessionStorage.setItem(SESSION_TOKEN_KEY,JSON.stringify(session))}catch{}
        rememberGrantScope(session.scope);done(resolve,session)
      },
      error_callback:error=>{
        const type=String(error?.type||'')
        const message=type==='popup_closed'?'Connexion Google annulée':type==='popup_failed_to_open'?'La fenêtre Google a été bloquée par le navigateur':'Connexion Google impossible pour ce domaine'
        done(reject,new Error(message))
      }
    })
    const alreadyGranted=googleOAuthPreviouslyGranted(DRIVE_SCOPE)
    const prompt=options.selectAccount?'select_account':(options.fromArt||alreadyGranted?'':'consent')
    try{client.requestAccessToken({prompt})}catch(error){done(reject,new Error(googleOAuthUserMessage('',error instanceof Error?error.message:'')))}
  })
}
export function clearMisesGoogleSession(){
  try{sessionStorage.removeItem(SESSION_TOKEN_KEY)}catch{}
}

async function api(url,init={}){
  const session=artGoogleSession()
  if(!session)throw new Error('Connecte Google dans MISES! puis réessaie')
  const response=await fetch(url,{...init,headers:{Authorization:`Bearer ${session.token}`,...(init.headers||{})}})
  if(!response.ok){let detail='';try{detail=(await response.json())?.error?.message||''}catch{}throw new Error(detail||`Google Drive : erreur ${response.status}`)}
  return response
}

export async function connectedGoogleProfile(){
  const response=await api('https://www.googleapis.com/oauth2/v3/userinfo')
  return await response.json()
}

async function searchFolders(clause){
  const params=new URLSearchParams({q:`mimeType = '${FOLDER_MIME}' and trashed = false and ${clause}`,fields:'files(id,name,parents,appProperties,webViewLink)',pageSize:'50',spaces:'drive'})
  const response=await api('https://www.googleapis.com/drive/v3/files?'+params.toString())
  return (await response.json()).files||[]
}

async function createFolder(name,parentId){
  const metadata={name,mimeType:FOLDER_MIME,appProperties:{misesManaged:'1'}}
  if(parentId)metadata.parents=[parentId]
  const response=await api('https://www.googleapis.com/drive/v3/files?fields=id,name,parents,webViewLink,appProperties',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(metadata)})
  return await response.json()
}

async function folderNamed(name,parentId){
  const parent=parentId?` and '${q(parentId)}' in parents`:''
  return (await searchFolders(`name = '${name}'${parent}`))[0]||null
}

export async function ensureMisesFolder(){
  let art=await folderNamed('_ART')
  if(!art)art=await createFolder('_ART')
  let mises=await folderNamed(DRIVE_FOLDER_NAME,art.id)
  if(!mises)mises=await createFolder(DRIVE_FOLDER_NAME,art.id)
  return {art,mises}
}

async function findNamed(folderId,name){
  const params=new URLSearchParams({q:`'${q(folderId)}' in parents and name = '${name}' and trashed = false`,fields:'files(id,name,modifiedTime,version,webViewLink)',pageSize:'10',spaces:'drive'})
  const response=await api('https://www.googleapis.com/drive/v3/files?'+params.toString())
  return (await response.json()).files?.[0]||null
}

async function readFilePayload(file){
  const response=await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`)
  return await response.json()
}

export async function loadPrivateState(){
  const art=await folderNamed('_ART')
  if(art){
    const mises=await folderNamed(DRIVE_FOLDER_NAME,art.id)
    const current=mises?await findNamed(mises.id,DRIVE_STATE_NAME):null
    if(current)return {folder:mises,file:current,payload:await readFilePayload(current)}
    const legacyFolder=await folderNamed(LEGACY_DRIVE_FOLDER_NAME,art.id)
    const legacy=legacyFolder?await findNamed(legacyFolder.id,LEGACY_DRIVE_STATE_NAME):null
    if(legacy)return {folder:legacyFolder,file:legacy,payload:await readFilePayload(legacy),legacy:true}
  }
  return {folder:null,file:null,payload:null}
}

export async function savePrivateState(payload){
  const {mises}=await ensureMisesFolder()
  const current=await findNamed(mises.id,DRIVE_STATE_NAME)
  const boundary='mises_'+Date.now()
  const metadata={name:DRIVE_STATE_NAME,mimeType:'application/json',appProperties:{misesKind:'personal-state',misesVersion:'1'}}
  if(!current)metadata.parents=[mises.id]
  const body=new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(payload),`\r\n--${boundary}--`
  ])
  const endpoint=current
    ?`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(current.id)}?uploadType=multipart&fields=id,name,modifiedTime,version,webViewLink`
    :'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,version,webViewLink'
  const response=await api(endpoint,{method:current?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body})
  return {folder:mises,file:await response.json()}
}

async function ensureSharesFolder(){
  const {mises}=await ensureMisesFolder()
  let shares=(await searchFolders(`name = 'Partages' and '${q(mises.id)}' in parents`))[0]
  if(!shares)shares=await createFolder('Partages',mises.id)
  return shares
}
async function createJsonFile(name,payload,parentId,kind='share-package'){
  const boundary='mises_share_'+Date.now()
  const metadata={name,mimeType:'application/json',parents:[parentId],appProperties:{misesKind:kind,misesVersion:'1'}}
  const body=new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(payload),`\r\n--${boundary}--`
  ])
  const response=await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,version,webViewLink,parents',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body})
  return await response.json()
}
async function grantFileReader(fileId,email){
  const response=await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?sendNotificationEmail=true&fields=id,emailAddress,role,type`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'user',role:'reader',emailAddress:email})
  })
  return await response.json()
}
export async function createSharePackage(payload,recipientEmails=[]){
  const shares=await ensureSharesFolder()
  const stamp=new Date().toISOString().replace(/[:.]/g,'-')
  const file=await createJsonFile(`MISES-partage-${stamp}.json`,payload,shares.id)
  const recipients=[...new Set(recipientEmails.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean))]
  const permissions=[]
  for(const email of recipients) permissions.push(await grantFileReader(file.id,email))
  return {folder:shares,file,recipients,permissions}
}
export async function loadSharePackage(fileId){
  const response=await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`)
  return await response.json()
}
