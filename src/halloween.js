// A themed view over the existing index, never a second database or invented stock.
// Prefixes catch plural/feminine terms without depending on an online AI service.
export const HALLOWEEN_THEMES = [
  {id:'all',label:'Tout Halloween',roots:[]},
  {id:'haunted',label:'Maison hantée',roots:['maison','manoir','porte','grinc','parquet','escalier','volet','chaine','chaîne','verrou','craqu','clef','serrure','cave']},
  {id:'creatures',label:'Créatures',roots:['fantom','spectr','sorci','monstr','loup','hibou','vampir','zombi','squelet','chauve souris','araign','hurle','cri','souffl','rican','grogn']},
  {id:'storm',label:'Nuit & tempête',roots:['nuit','vent','tempet','orage','pluie','tonner','foudr','foret','forêt','pas','murmur','ombre','goutt','cloch','peur']},
  {id:'materials',label:'Bruitages à fabriquer',roots:['papier','carton','plastique','tissu','metal','métal','bois','pierre','chaine','chaîne','tambour','frott','gratt','percuss']}
]
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const rootMatches=(search,root)=> {
  const phrase=normalize(root)
  if(!phrase)return false
  // Avoid matching "pas" in "passage", or "cri" in "crique".
  return search.split(' ').some((word,i,words)=>{
    const segments=phrase.split(' ')
    return segments.every((part,j)=>words[i+j] && (part.length<=3?words[i+j]===part:words[i+j].startsWith(part)))
  })
}
export function halloweenMatches(rows=[],{theme='all',query=''}={}){
  const chosen=HALLOWEEN_THEMES.find(item=>item.id===theme)||HALLOWEEN_THEMES[0]
  const roots=chosen.id==='all'?[...new Set(HALLOWEEN_THEMES.slice(1).flatMap(item=>item.roots))]:chosen.roots
  const search=normalize(query)
  return rows.map(row=>{
    const text=normalize([row.label,...(row.terms||[])].join(' '))
    const matches=roots.filter(root=>rootMatches(text,root))
    return {...row,halloweenScore:matches.length,searchText:text}
  }).filter(row=>row.halloweenScore>0&&(!search||row.searchText.includes(search)))
    .sort((a,b)=>b.halloweenScore-a.halloweenScore||a.label.localeCompare(b.label,'fr'))
}
