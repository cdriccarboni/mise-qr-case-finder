import { instrumentVocabulary } from './instrument-vocabulary.js'

const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const unique=list=>[...new Set((list||[]).filter(Boolean))]

function record(kind,id,label,terms=[],meta={}){
  const all=unique([label,...terms]).map(String).filter(Boolean)
  return {kind,id,label,terms:all,search:norm(all.join(' ')),...meta}
}

export function buildGlobalIndex({objects=[],cases=[],kits=[],mises=[],publicFoley={},seed={}}={}){
  const rows=[]
  for(const o of objects) rows.push(record('objet',o.id,o.name,[o.hear,o.imagine,o.device,o.family,o.notes,...(o.sounds||[]),...(o.aliases||[]),...(o.tags||[]),...(o.contexts||[])]))
  for(const c of cases) rows.push(record('contenant',c.id,c.name,[c.location,c.notes,c.part,c.total]))
  for(const k of kits) rows.push(record('kit',k.id,k.name,[k.description,k.source,...(k.contexts||[])]))
  for(const m of mises) rows.push(record('mise',m.id,m.name,[m.projectName,m.notes]))
  for(const s of seed.sounds||[]) rows.push(record('son',s.id,s.name,[...(s.aliases||[]),...(s.tags||[]),...(s.families||[])]))
  for(const d of seed.resource_index||[]) rows.push(record('document',d.id||d.name,d.name,[d.indexed_text,d.summary,d.path]))
  for(const g of publicFoley.games||[]) rows.push(record('jeu',g.id,g.title,[g.description,g.kind]))
  for(const a of publicFoley.pedagogyActivities||[]) rows.push(record('activité',a.id,a.title,[a.goal,...(a.gameIds||[])]))
  for(const f of publicFoley.fabrications||[]) rows.push(record('fabrication',f.id,f.name,[f.use,f.assembly,...(f.materials||[])]))
  for(const p of publicFoley.records||[]) rows.push(record('recette publique',p.id,p.sound,[p.technique,p.fabrication,p.sourceRef,...(p.objects||[])],{themeTags:p.themeTags||[]}))
  const dataTerms=unique([
    ...(seed.sounds||[]).flatMap(x=>[x.name,...(x.aliases||[]),...(x.tags||[])]),
    ...objects.flatMap(x=>[x.name,x.device,x.family,...(x.aliases||[]),...(x.tags||[]),...(x.sounds||[])])
  ])
  for(const ins of instrumentVocabulary(dataTerms)) rows.push(record('instrument',`instrument:${norm(ins.name)}`,ins.name,[ins.family,...ins.aliases],{family:ins.family}))
  return rows
}

export function indexStats(rows=[]){
  return {
    total:rows.length,
    objects:rows.filter(x=>x.kind==='objet').length,
    sounds:rows.filter(x=>x.kind==='son').length,
    containers:rows.filter(x=>x.kind==='contenant').length,
    documents:rows.filter(x=>x.kind==='document').length,
    instruments:rows.filter(x=>x.kind==='instrument').length,
    games:rows.filter(x=>x.kind==='jeu').length,
    publicRecipes:rows.filter(x=>x.kind==='recette publique').length,
    terms:unique(rows.flatMap(x=>x.terms.map(norm))).filter(Boolean).length
  }
}

export function searchGlobalIndex(rows=[],query='',limit=40){
  const q=norm(query)
  if(!q)return []
  const words=q.split(' ').filter(Boolean)
  return rows.map(row=>{
    const exact=row.search.includes(q)
    const hits=words.filter(word=>row.search.includes(word)).length
    return {...row,_score:(exact?100:0)+hits}
  }).filter(row=>row._score>0).sort((a,b)=>b._score-a._score||a.label.localeCompare(b.label,'fr')).slice(0,limit)
}

export function diagnosticHtml(stats,esc=value=>String(value)){
  return `<div class="indexDiag"><b>État de l’index</b><div class="publicStats">
    <span><b>${stats.objects}</b> objets</span><span><b>${stats.sounds}</b> sons</span>
    <span><b>${stats.containers}</b> contenants</span><span><b>${stats.documents}</b> documents</span>
    <span><b>${stats.instruments}</b> instruments</span><span><b>${stats.publicRecipes}</b> recettes Web</span>
    <span><b>${stats.games}</b> jeux</span><span><b>${stats.terms}</b> termes</span>
  </div><small>${esc(stats.total)} entrées indexées. La reconstruction ne modifie aucune donnée métier.</small></div>`
}
