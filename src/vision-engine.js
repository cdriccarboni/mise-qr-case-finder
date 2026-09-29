import { instrumentVocabulary } from './instrument-vocabulary.js'

const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const unique=list=>[...new Set((list||[]).filter(Boolean))]

export const VISION_MODULES = {
  standard:{id:'standard',label:'Vision standard',status:'available',engine:'COCO-SSD local',offline:true,optional:false},
  advanced:{id:'advanced',label:'Vision avancée',status:'not-installed',engine:'open-vocabulary candidate',offlineTarget:true,optional:true},
  memory:{id:'memory',label:'Mémoire visuelle',status:'local-ready',engine:'confirmed references',offline:true,optional:false}
}

export const VISION_LEVELS = [
  {id:'identified',label:'IDENTIFIÉ',min:.88},
  {id:'probable',label:'PROBABLE',min:.7},
  {id:'suggestion',label:'SUGGESTION',min:.45},
  {id:'unknown',label:'À IDENTIFIER',min:0}
]

export function confidenceLevel(score=0){
  const value=Math.max(0,Math.min(1,Number(score)||0))
  return VISION_LEVELS.find(level=>value>=level.min)||VISION_LEVELS.at(-1)
}

export function buildVisionVocabulary({objects=[],seed={},publicFoley={}}={}){
  const objectTerms=objects.flatMap(o=>[o.name,o.device,o.family,...(o.aliases||[]),...(o.tags||[]),...(o.sounds||[])])
  const publicTerms=(publicFoley.records||[]).flatMap(r=>[r.sound,r.fabrication,...(r.objects||[])])
  const soundTerms=(seed.sounds||[]).flatMap(s=>[s.name,...(s.aliases||[]),...(s.tags||[])])
  const instruments=instrumentVocabulary([...objectTerms,...soundTerms]).flatMap(i=>[i.name,...i.aliases])
  return unique([...objectTerms,...publicTerms,...soundTerms,...instruments].map(x=>String(x||'').trim()).filter(x=>x.length>1))
}

export function mergeVisionCandidates(candidates=[],context={}){
  const grouped=new Map()
  for(const item of candidates){
    if(!item||item.rejected)continue
    const key=item.objectId||norm(item.label||item.rawLabel||'unknown')
    if(!key)continue
    const current=grouped.get(key)||{...item,score:0,evidence:[]}
    const score=Math.max(0,Math.min(1,Number(item.score??item.confidence)||0))
    const sourceWeight=item.source==='visual-memory'?1:item.source==='open-vocabulary'?.95:.85
    current.score=Math.max(current.score,score*sourceWeight)
    current.evidence=unique([...(current.evidence||[]),item.source||'vision'])
    if(item.objectId)current.objectId=item.objectId
    if(item.label)current.label=item.label
    grouped.set(key,current)
  }
  return [...grouped.values()].map(item=>{
    let score=item.score
    if(item.objectId&&context.availableObjectIds?.includes(item.objectId))score=Math.min(.99,score+.05)
    if(item.objectId&&context.caseObjectIds?.includes(item.objectId))score=Math.min(.99,score+.08)
    const level=confidenceLevel(score)
    return {...item,score,confidenceLevel:level.id,confidenceLabel:level.label,validated:false}
  }).sort((a,b)=>b.score-a.score)
}

export function visualReference({objectId,photo,bbox,context='',source='human-confirmed'}={}){
  return {
    id:`visual-ref-${crypto.randomUUID()}`,
    kind:'visual-reference',
    objectId,photo,bbox:bbox||null,context,
    source,createdAt:new Date().toISOString(),reversible:true
  }
}

export function visionStatus({learnings=[]}={}){
  const refs=(learnings||[]).filter(x=>x.kind==='visual-reference')
  return {
    modules:VISION_MODULES,
    references:refs.length,
    standard:'Vision standard disponible',
    advanced:'Vision avancée non installée',
    memory:`${refs.length} référence(s) visuelle(s) locale(s)`
  }
}

export const VISION_BENCHMARK_PLAN = {
  status:'not-run-on-real-device',
  reason:'Le benchmark Pixel 9 doit être mesuré sur appareil réel; aucun score n’est inventé.',
  candidates:['COCO-SSD standard','open-vocabulary optionnel','mémoire visuelle locale','cascade hybride'],
  metrics:['bonnes identifications','faux positifs','objets ratés','latence','mémoire','poids modèle','offline'],
  corpus:['objets ordinaires','objets de bruitage','instruments','petits accessoires','objets proches','occlusion','objet tenu','vrac','valise pleine','lumière médiocre']
}
