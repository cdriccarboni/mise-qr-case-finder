const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const unique=list=>[...new Set((list||[]).filter(Boolean))]
const pick=(list,rng=Math.random)=>list.length?list[Math.floor(rng()*list.length)]:null

export function publicReferenceIdeas(library={}){
  return (library.records||[]).map(row=>({
    name:row.sound,
    sounds:row.objects||[],
    aliases:[row.technique,row.sourceRef].filter(Boolean),
    summary:row.technique,
    source:(library.sources||[]).find(s=>s.id===row.sourceId)?.name||'Source Internet',
    sourceUrl:row.sourceUrl,
    kind:'Recette publique',
    publicationScope:'PUBLIC_WEB'
  }))
}

export function recordMatchesObject(record,object){
  const hay=normalize([object?.name,object?.family,object?.device,object?.notes,...(object?.tags||[]),...(object?.aliases||[]),...(object?.sounds||[])].join(' '))
  return (record?.objects||[]).some(name=>{
    const needle=normalize(name)
    if(!needle)return false
    return hay.includes(needle)||needle.includes(normalize(object?.name))
  })
}

export function publicRecordsForOwned(library={},objects=[]){
  return (library.records||[]).map(record=>{
    const matches=(objects||[]).filter(object=>recordMatchesObject(record,object))
    return {...record,ownedMatches:matches.map(object=>({id:object.id,name:object.name}))}
  }).filter(record=>record.ownedMatches.length)
}

export function searchPublicLibrary(library={},query=''){
  const q=normalize(query)
  if(!q)return []
  return (library.records||[]).filter(row=>normalize([row.sound,row.technique,...(row.objects||[]),row.fabrication,row.sourceRef].join(' ')).includes(q)).slice(0,40)
}

export function randomPublicUniverse(library={},objects=[],options={}){
  const rng=options.rng||Math.random
  const frames=library.universeFrames||[]
  const frame=options.frameId?frames.find(x=>x.id===options.frameId):pick(frames,rng)
  if(!frame)return null
  const keywords=(frame.keywords||[]).map(normalize)
  const candidates=(library.records||[]).filter(row=>{
    const hay=normalize([row.sound,row.technique,...(row.objects||[])].join(' '))
    return keywords.some(keyword=>hay.includes(keyword))
  })
  const owned=publicRecordsForOwned({records:candidates},objects)
  const sourcePool=owned.length?owned:candidates
  const selected=[]
  for(const item of [...sourcePool].sort(()=>rng()-.5)){
    if(selected.length>=Math.min(5,Math.max(3,sourcePool.length)))break
    if(!selected.some(x=>x.soundId===item.soundId))selected.push(item)
  }
  return {
    id:`universe-${frame.id}-${Date.now()}`,
    title:frame.title,
    frame,
    records:selected,
    ownedOnly:Boolean(owned.length),
    objects:unique(selected.flatMap(row=>row.ownedMatches?.map(x=>x.name)||[])),
    source:'Bibliothèque publique MISES!'
  }
}

function publicSolution(record){
  return {
    objects:(record.objects||[]).map(name=>({name})),
    gesture:record.technique,
    tips:[record.sourceRef].filter(Boolean),
    source:record.sourceUrl||'Bibliothèque publique MISES!'
  }
}

export function generatePublicGame(library={},objects=[],options={}){
  const rng=options.rng||Math.random
  const wanted=options.gameId||pick((library.games||[]).map(x=>x.id),rng)
  const records=library.records||[]
  const owned=publicRecordsForOwned(library,objects)
  if(!records.length)return null

  if(wanted==='public-fabrication'){
    const fab=pick(library.fabrications||[],rng)
    if(!fab)return null
    return {
      id:`pg-fab-${Date.now()}`,gameType:'PUB-FAB',title:'Fabrique puis joue',
      prompt:`Fabrique : ${fab.name}`,
      instruction:`Matériaux : ${(fab.materials||[]).join(', ')}. Puis teste : ${fab.use}`,
      objectIds:[],hints:[fab.assembly],solution:{objects:(fab.materials||[]).map(name=>({name})),gesture:fab.use,tips:[fab.assembly],source:fab.sourceUrl},
      sourceUrl:fab.sourceUrl,publicationScope:'PUBLIC_WEB'
    }
  }

  if(wanted==='public-random-universe'){
    const universe=randomPublicUniverse(library,objects,{rng})
    if(!universe||!universe.records.length)return null
    return {
      id:`pg-universe-${Date.now()}`,gameType:'PUB-UNI',title:'Univers aléatoire',
      prompt:`Univers : ${universe.title}`,
      instruction:`Construis l'ambiance avec ${universe.records.length} couches : ${universe.records.map(x=>x.sound).join(' · ')}.`,
      objectIds:unique(universe.records.flatMap(r=>r.ownedMatches?.map(x=>x.id)||[])),
      hints:universe.records.map(r=>`${r.sound} — ${r.technique}`),
      solution:{objects:universe.records.flatMap(r=>(r.ownedMatches?.length?r.ownedMatches:(r.objects||[]).map(name=>({name})))),gesture:'Entrées successives, transformation, puis extinction.',tips:universe.records.map(r=>r.technique),source:'Bibliothèque publique sourcée'},
      publicRecords:universe.records,publicationScope:'PUBLIC_WEB'
    }
  }

  if(wanted==='public-method-duel'){
    const bySound=new Map()
    for(const row of records){
      const key=normalize(row.sound)
      const list=bySound.get(key)||[];list.push(row);bySound.set(key,list)
    }
    const group=pick([...bySound.values()].filter(x=>x.length>=2),rng)
    if(group){
      const pair=[group[0],group[1]]
      return {id:`pg-duel-${Date.now()}`,gameType:'PUB-DUEL',title:'Deux façons de faire',prompt:`Même cible : « ${pair[0].sound} »`,instruction:'Teste ou compare deux recettes documentées.',objectIds:[],hints:pair.map(x=>x.technique),solution:{objects:pair.flatMap(x=>(x.objects||[]).map(name=>({name}))),gesture:pair.map(x=>x.technique).join(' / '),tips:pair.map(x=>x.sourceRef),source:'Bibliothèque publique sourcée'},publicRecords:pair,publicationScope:'PUBLIC_WEB'}
    }
  }

  if(wanted==='public-object-remix'&&owned.length){
    const first=pick(owned,rng)
    const key=first.ownedMatches[0]?.id
    const same=owned.filter(r=>r.ownedMatches.some(x=>x.id===key)).slice(0,4)
    return {id:`pg-remix-${Date.now()}`,gameType:'PUB-REMIX',title:'Objet détourné',prompt:`Avec « ${first.ownedMatches[0].name} », explore plusieurs usages.`,instruction:same.map(x=>x.sound).join(' · '),objectIds:[key],hints:same.map(x=>x.technique),solution:{objects:[first.ownedMatches[0]],gesture:same.map(x=>x.technique).join(' → '),tips:same.map(x=>x.sound),source:'Inventaire réel + bibliothèque publique'},publicRecords:same,publicationScope:'PUBLIC_WEB'}
  }

  if(wanted==='public-inventory-only'&&owned.length){
    const row=pick(owned,rng)
    return {id:`pg-owned-${Date.now()}`,gameType:'PUB-OWN',title:'Défi valise réelle',prompt:`Fais entendre : « ${row.sound} ».`,instruction:'N’utilise que les objets réellement disponibles qui correspondent à cette recette publique.',objectIds:row.ownedMatches.map(x=>x.id),hints:[row.technique],solution:{objects:row.ownedMatches,gesture:row.technique,tips:[row.sourceRef],source:row.sourceUrl},publicRecords:[row],publicationScope:'PUBLIC_WEB'}
  }

  if(wanted==='public-sound-story'||wanted==='public-texture-chain'){
    const pool=owned.length?owned:records
    const chosen=[...pool].sort(()=>rng()-.5).slice(0,Math.min(4,pool.length))
    return {id:`pg-story-${Date.now()}`,gameType:'PUB-STORY',title:wanted==='public-texture-chain'?'Chaîne de textures':'Histoire sonore',prompt:wanted==='public-texture-chain'?'Enchaîne ces matières sans silence.':'Crée une petite histoire sonore en quatre temps.',instruction:chosen.map((x,i)=>`${i+1}. ${x.sound}`).join(' · '),objectIds:unique(chosen.flatMap(r=>r.ownedMatches?.map(x=>x.id)||[])),hints:chosen.map(x=>x.technique),solution:{objects:chosen.flatMap(r=>(r.ownedMatches?.length?r.ownedMatches:(r.objects||[]).map(name=>({name})))),gesture:'Début → événement → transformation → fin.',tips:chosen.map(x=>x.technique),source:'Bibliothèque publique sourcée'},publicRecords:chosen,publicationScope:'PUBLIC_WEB'}
  }

  const row=pick(owned.length?owned:records,rng)
  return {
    id:`pg-mystery-${Date.now()}`,gameType:'PUB-MYS',title:'Recette mystère',
    prompt:`Objets : ${(row.ownedMatches?.length?row.ownedMatches.map(x=>x.name):row.objects||[]).join(', ')}`,
    instruction:'Lis le geste, puis devine le son visé avant d’afficher la solution.',
    objectIds:row.ownedMatches?.map(x=>x.id)||[],hints:[row.technique],
    solution:{...publicSolution(row),tips:[`Son visé : ${row.sound}`,row.sourceRef].filter(Boolean)},
    publicRecords:[row],publicationScope:'PUBLIC_WEB'
  }
}

export function publicActivityProgram(library={},objects=[],duration=30,options={}){
  const rng=options.rng||Math.random
  const activities=library.pedagogyActivities||[]
  const selected=[]
  let total=0
  for(const activity of [...activities].sort(()=>rng()-.5)){
    if(total+activity.durationMin>duration&&selected.length)continue
    const game=generatePublicGame(library,objects,{gameId:pick(activity.gameIds||[],rng),rng})
    if(!game)continue
    selected.push({...activity,game})
    total+=activity.durationMin
    if(total>=duration)break
  }
  return {duration,totalMinutes:total,activities:selected,source:'PUBLIC_WEB'}
}
