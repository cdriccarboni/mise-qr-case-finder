// Editorial ambience suggestions over existing stock and documented public recipes.
// Never infer ownership: a themed recipe is inspiration, not an object in a case.
const group=(id,label,strong,support=[])=>({id,label,strong,support})
const pack=(id,label,icon,description,groups)=>({id,label,icon,description,groups})

export const THEME_PACKS=[
  pack('halloween','Halloween','🎃','Étrange, hanté, créatures et atmosphères inquiétantes.',[
    group('haunted','Maison hantée',['fantom','spectr','hante','manoir','cimeti','cercueil','porte de pierre gigantesque'],['grinc','chaine','verrou','serrure','craqu','parquet','porte']),
    group('creatures','Créatures fantastiques',['sorci','zomb','vampir','squelet','monstr','creatur','chauve souris','loup garou','dragon','araign'],['hurle','grogn','ailes','pas lourd']),
    group('night','Nuit mystérieuse',['tonnerr','orage','foudr','hibou','corbeau','hurlement','nuit'],['vent','pluie','murmur','souffl','pas','cloche']),
    group('spells','Sortilèges',['sortileg','potion','incant','magique','objet magique','rituel'],['cristal','resonan','vibr','etrange'])
  ]),
  pack('noel','Noël & fêtes d’hiver','🎄','Sons d’hiver, de fête, de maison et de cadeaux.',[
    group('snow','Neige & traîneau',['neige','traineau','renne','givre','glace','flocon'],['hiver','froid','pas','vent']),
    group('bells','Grelots & cloches',['grelot','clochette','carillon','cloche de noel','noel'],['tintement','metallique','fete']),
    group('home','Feu de cheminée',['cheminee','buches','feu de bois','crepitement de feu'],['flamme','crepit','foyer','bois']),
    group('gifts','Cadeaux & festivités',['cadeau','emballage','ruban de cadeau','papier cadeau','sapin','festivite'],['froiss','tintement','rire','papier'])
  ]),
  pack('hiver','Hiver & montagne','❄️','Neige, froid, ski, glace et grands espaces.',[
    group('ice','Neige & glace',['neige','givre','glace','glissade','ski','gel'],['craqu','pas','criss']),
    group('mountain','Montagne',['avalanche','montagne','ski','poudreuse','chalet'],['vent','souffl','pas'])
  ]),
  pack('mer','Mer & pirates','🏴‍☠️','Navigation, eau, cordages et aventures maritimes.',[
    group('water','Vagues & eau',['vague','clapot','ocean','mer','barque','bateau','sous marin'],['eau','liquide','plouf']),
    group('ship','À bord du navire',['navire','voile','cordage','ancre','gouvernail','pont de bateau','coque'],['corde','grinc','bois']),
    group('adventure','Aventure maritime',['pirate','tresor','tempete en mer','mouette','port'],['vent','pluie','chaine'])
  ]),
  pack('foret','Forêt & nature','🌲','Vie végétale, sous-bois et sons du dehors.',[
    group('trees','Feuilles & sous-bois',['foret','sous bois','feuillage','feuilles mortes','branches','brindilles','herbe haute'],['bois','froiss','pas']),
    group('wildlife','Oiseaux & nature',['oiseau','hibou','corbeau','insecte','ruisseau','rivier'],['ailes','chant','souffl'])
  ]),
  pack('meteo','Orage & météo','🌧️','Pluie, tonnerre, vent et phénomènes naturels.',[
    group('storm','Orage',['orage','tonnerre','foudre','tempete','averse'],['vent','pluie','impact']),
    group('rain','Pluie & gouttes',['pluie','goutte','ruissel','averse','clapot'],['eau','toile','bache']),
    group('wind','Vent',['vent','rafale','bourrasque','souffle de vent'],['herbes','bache','voile'])
  ]),
  pack('magie','Contes & magie','✨','Créatures, sortilèges et objets merveilleux.',[
    group('enchantment','Sortilèges',['magique','magie','sortileg','cristal','enchant','potion'],['resonan','vibr','clochette']),
    group('creatures','Créatures fabuleuses',['dragon','creature','geant','serpent','monstre','aile de creature'],['grogn','ailes','pas lourd'])
  ]),
  pack('sciencefiction','Espace & science-fiction','🚀','Machines futuristes et univers étranges.',[
    group('space','Espace',['spatial','cosmique','vaisseau','laser','science fiction','futuriste','extraterrestre'],['resonan','electri','vibr']),
    group('robot','Robots & mécanismes',['robot','mecanique organique','engrenage','transmission','neon','electrique'],['mecanique','cliquet','bourdonn'])
  ]),
  pack('ville','Ville & quotidien','🏙️','Rue, intérieur, déplacements et vie collective.',[
    group('street','Dans la rue',['rue','foule','circulation','pneu','voiture','tramway','metro'],['pas','chaussure','roulement']),
    group('home','Dans la maison',['chaise','tasse','porte','parquet','cuisine','tiroir'],['grinc','gliss','vaisselle'])
  ]),
  pack('animaux','Animaux & bestiaire','🐾','Pattes, ailes, cris et mouvements d’animaux.',[
    group('feet','Pattes & démarches',['pattes','sabots','meuglement','animal','cheval','serpent'],['pas','froiss','souffl']),
    group('wings','Ailes & insectes',['oiseau','insecte','ailes','envol','bourdonnement d insecte'],['frott','vibr','souffl'])
  ]),
  pack('voyages','Voyages & transports','🚂','Trains, déplacements, mécanique et trajets.',[
    group('rail','Trains',['locomotive','train','wagon','chemin de fer','vapeur'],['roulement','sifflement','mecanique']),
    group('road','Sur la route',['charrette','voiture','pneu','frein','velo','roue','moteur'],['mecanique','roulement','pas']),
    group('water','Sur l’eau',['barque','bateau','navire','voile'],['eau','clapot','cordage'])
  ]),
  pack('cirque','Cirque & fête','🎪','Spectacles, jeux, public et fête foraine.',[
    group('party','Fête & musique',['fete','carnaval','fanfare','clown','applaudissement','foule','manège'],['cloche','percussion','rire']),
    group('show','Scène & spectacle',['theatre','spectacle','rideau','salle de spectacle','public','applaudissement'],['pas','tissu','roulement'])
  ]),
  pack('medieval','Châteaux & légendes','🏰','Portes, chevaux, forteresses et mondes anciens.',[
    group('castle','Château',['chateau','forteresse','pont levis','porte de pierre gigantesque','armure'],['grinc','chaine','bois']),
    group('journey','Cheval & charrette',['cheval','sabots','charrette','caleche'],['roulement','pas','bois'])
  ]),
  pack('mystere','Mystère & enquête','🔎','Indices, pas discrets, horloges et suspense.',[
    group('clues','Indices & petits sons',['tic tac','horloge','cadenas','serrure','clef','verrou'],['cliquet','pas','porte']),
    group('suspense','Suspense',['battement de coeur','murmure','chuchot','pas discret','grincement de porte'],['souffl','silence','craqu'])
  ])
]

const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const words=value=>normalized(value).split(' ').filter(Boolean)
function rootIn(text,root){
  const rootWords=words(root),hayWords=words(text)
  if(!rootWords.length)return false
  return hayWords.some((_,at)=>rootWords.every((part,j)=>{
    const word=hayWords[at+j]
    return word && (part.length<=3?word===part:word.startsWith(part))
  }))
}
function scoreGroup(row,group){
  const label=normalized(row.label)
  const other=normalized((row.terms||[]).filter(term=>term!==row.label).join(' '))
  const strongHits=group.strong.filter(root=>rootIn(label,root)||(root!=='spectr'&&rootIn(other,root)))
  const supportHits=group.support.filter(root=>rootIn(label,root)||rootIn(other,root))
  // A theme needs an explicit cue. Two generic material/action words are not enough.
  if(strongHits.length===0)return null
  return {
    score:strongHits.reduce((sum,root)=>sum+(rootIn(label,root)?9:6),0)+supportHits.reduce((sum,root)=>sum+(rootIn(label,root)?2:1),0),
    matched:[...strongHits,...supportHits]
  }
}
const isOwned=row=>['objet','contenant','kit','mise'].includes(row.kind)
const isPublic=row=>['recette publique','fabrication','jeu','activité'].includes(row.kind)

/** Match editorial themes against existing rows; never synthesizes stock or public recipes. */
export function searchThemeIndex(rows=[],{theme='halloween',group='all',query='',source='all',limit=Infinity}={}){
  const chosen=THEME_PACKS.find(item=>item.id===theme)||THEME_PACKS[0]
  const qWords=words(query)
  const groups=group==='all'?chosen.groups:chosen.groups.filter(item=>item.id===group)
  return rows.filter(row=>source==='all'||(source==='mine'?isOwned(row):source==='public'?isPublic(row):true))
    .map(row=>{
      const searchText=normalized([row.label,...(row.terms||[])].join(' '))
      if(!qWords.every(word=>rootIn(searchText,word)))return null
      const matches=groups.map(entry=>({entry,...(scoreGroup(row,entry)||{})})).filter(entry=>entry.score>0)
      if(!matches.length)return null
      const highest=matches.sort((a,b)=>b.score-a.score)[0]
      const editorialBoost=(row.themeTags||[]).includes(chosen.id)?3:0
      return {...row,themeScore:highest.score+editorialBoost,themeGroup:highest.entry.id,themeCues:highest.matched,searchText}
    }).filter(Boolean).sort((a,b)=>b.themeScore-a.themeScore||a.label.localeCompare(b.label,'fr')).slice(0,limit)
}
export function publicRecipeThemeTags(recipe={}){
  const row={label:recipe.sound||'',terms:[recipe.sound,recipe.technique,...(recipe.objects||[])].filter(Boolean)}
  return THEME_PACKS.filter(pack=>searchThemeIndex([row],{theme:pack.id}).length>0).map(pack=>pack.id)
}
