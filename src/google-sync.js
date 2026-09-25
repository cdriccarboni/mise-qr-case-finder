const ART_TOKEN_KEY='art-google-oauth-session-v1'
const MISE_TOKEN_KEY='mise-google-oauth-session-v1'
const CLIENT_ID_KEY='mise-google-oauth-client-id'
const GOOGLE_CLIENT_META='mise-google-client-id'
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive'
const GOOGLE_SCOPES=`openid email profile ${DRIVE_SCOPE}`
const FOLDER_MIME='application/vnd.google-apps.folder'
const STATE_NAME='mise-data.json'
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

export function artGoogleSession(){
  return readStoredSession(MISE_TOKEN_KEY)||readStoredSession(ART_TOKEN_KEY)
}

function directClientId(){
  const meta=typeof document!=='undefined'
    ?document.querySelector(`meta[name="${GOOGLE_CLIENT_META}"]`)?.content||''
    :''
  if(validClientId(meta))return meta.trim()
  try{
    const local=localStorage.getItem(CLIENT_ID_KEY)||''
    if(validClientId(local))return local.trim()
  }catch{}
  return GOOGLE_PRODUCTION_CLIENT_ID
}

async function ensureGoogleIdentity(){
  if(globalThis.google?.accounts?.oauth2)return globalThis.google
  if(gisPromise)return gisPromise
  gisPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-mise-google-identity]')
    if(existing){
      existing.addEventListener('load',()=>resolve(globalThis.google),{once:true})
      existing.addEventListener('error',()=>reject(new Error('Chargement Google impossible')),{once:true})
      return
    }
    const script=document.createElement('script')
    script.src='https://accounts.google.com/gsi/client'
    script.async=true
    script.defer=true
    script.dataset.miseGoogleIdentity='1'
    script.onload=()=>resolve(globalThis.google)
    script.onerror=()=>reject(new Error('Chargement Google impossible'))
    document.head.appendChild(script)
  }).finally(()=>{gisPromise=null})
  return gisPromise
}

export async function requestGoogleSession(){
  const current=artGoogleSession()
  if(current)return current
  const clientId=directClientId()
  if(!validClientId(clientId))throw new Error('Connexion Google MISE ! non configurée')
  const googleApi=await ensureGoogleIdentity()
  if(!googleApi?.accounts?.oauth2)throw new Error('Google Identity indisponible')

  return await new Promise((resolve,reject)=>{
    let settled=false
    const done=(fn,value)=>{if(settled)return;settled=true;fn(value)}
    const client=googleApi.accounts.oauth2.initTokenClient({
      client_id:clientId,
      scope:GOOGLE_SCOPES,
      callback:response=>{
        if(response?.error){
          done(reject,new Error(response.error_description||response.error||'Connexion Google refusée'))
          return
        }
        const expiresIn=Math.max(60,Number(response?.expires_in)||3600)
        const session={
          token:response.access_token,
          scope:response.scope||GOOGLE_SCOPES,
          expiresAt:Date.now()+expiresIn*1000,
          source:'mise-direct'
        }
        try{sessionStorage.setItem(MISE_TOKEN_KEY,JSON.stringify(session))}catch{}
        done(resolve,session)
      },
      error_callback:error=>{
        const type=String(error?.type||'')
        const message=type==='popup_closed'
          ?'Connexion Google annulée'
          :type==='popup_failed_to_open'
            ?'La fenêtre Google a été bloquée par le navigateur'
            :'Connexion Google impossible pour ce domaine'
        done(reject,new Error(message))
      }
    })
    try{client.requestAccessToken({prompt:'consent'})}
    catch(error){done(reject,error instanceof Error?error:new Error('Connexion Google impossible'))}
  })
}

export function clearMiseGoogleSession(){
  try{sessionStorage.removeItem(MISE_TOKEN_KEY)}catch{}
}

async function api(url,init={}){
  const session=artGoogleSession()
  if(!session)throw new Error('Connecte Google dans MISE ! puis réessaie')
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
  const metadata={name,mimeType:FOLDER_MIME,appProperties:{miseManaged:'1'}}
  if(parentId)metadata.parents=[parentId]
  const response=await api('https://www.googleapis.com/drive/v3/files?fields=id,name,parents,webViewLink,appProperties',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(metadata)})
  return await response.json()
}

export async function ensureMiseFolder(){
  let art=(await searchFolders(`name = '_ART'`))[0]
  if(!art)art=await createFolder('_ART')
  let mise=(await searchFolders(`name = 'MISE !' and '${q(art.id)}' in parents`))[0]
  if(!mise)mise=await createFolder('MISE !',art.id)
  return {art,mise}
}

async function findState(folderId){
  const params=new URLSearchParams({q:`'${q(folderId)}' in parents and name = '${STATE_NAME}' and trashed = false`,fields:'files(id,name,modifiedTime,version,webViewLink)',pageSize:'10',spaces:'drive'})
  const response=await api('https://www.googleapis.com/drive/v3/files?'+params.toString())
  return (await response.json()).files?.[0]||null
}

export async function loadPrivateState(){
  const {mise}=await ensureMiseFolder(),file=await findState(mise.id)
  if(!file)return {folder:mise,file:null,payload:null}
  const response=await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`)
  return {folder:mise,file,payload:await response.json()}
}

export async function savePrivateState(payload){
  const {mise}=await ensureMiseFolder(),current=await findState(mise.id)
  const boundary='mise_'+Date.now()
  const metadata={name:STATE_NAME,mimeType:'application/json',appProperties:{miseKind:'personal-state',miseVersion:'1'}}
  if(!current)metadata.parents=[mise.id]
  const body=new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(payload),`\r\n--${boundary}--`
  ])
  const endpoint=current
    ?`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(current.id)}?uploadType=multipart&fields=id,name,modifiedTime,version,webViewLink`
    :'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,version,webViewLink'
  const response=await api(endpoint,{method:current?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body})
  return {folder:mise,file:await response.json()}
}
