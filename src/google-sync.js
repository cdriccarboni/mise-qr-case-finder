const TOKEN_KEY='art-google-oauth-session-v1'
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive'
const FOLDER_MIME='application/vnd.google-apps.folder'
const STATE_NAME='mise-data.json'

function q(value){return String(value||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
export function artGoogleSession(){
  try{
    const saved=JSON.parse(sessionStorage.getItem(TOKEN_KEY)||'null')
    if(!saved?.token||!saved.expiresAt||saved.expiresAt<Date.now()+60000)return null
    if(!String(saved.scope||'').split(/\s+/).includes(DRIVE_SCOPE))return null
    return saved
  }catch{return null}
}
async function api(url,init={}){
  const session=artGoogleSession()
  if(!session)throw new Error('Reconnecte Google dans ART > Connexions, puis reviens dans MISE !')
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
