export const INSTRUMENT_FAMILIES = [
  { id:'strings-bowed', label:'Cordes frottées', terms:['violon','alto','violoncelle','contrebasse'] },
  { id:'strings-plucked', label:'Cordes pincées', terms:['guitare acoustique','guitare électrique','basse','banjo','mandoline','ukulélé','harpe','luth'] },
  { id:'keyboards', label:'Claviers', terms:['piano','piano droit','piano à queue','clavier','synthétiseur','orgue','accordéon','mélodica'] },
  { id:'woodwinds-flutes', label:'Flûtes', terms:['flûte traversière','flûte à bec','piccolo','ocarina'] },
  { id:'woodwinds-reeds', label:'Anches', terms:['clarinette','clarinette basse','saxophone','hautbois','cor anglais','basson','harmonica'] },
  { id:'brass', label:'Cuivres', terms:['trompette','cor','trombone','tuba'] },
  { id:'drums', label:'Peaux et batterie', terms:['batterie','caisse claire','grosse caisse','tom','tambourin'] },
  { id:'idiophones', label:'Idiophones et métaux', terms:['cymbale','charleston','triangle','maracas','claves','woodblock','xylophone','vibraphone','marimba','glockenspiel','gong','cloche','carillon'] },
  { id:'small', label:'Petits instruments', terms:['kazoo','guimbarde','sifflet','appeau'] },
  { id:'electronic', label:'Électroniques', terms:['boîte à rythmes','sampler','contrôleur midi','synthétiseur modulaire'] }
]

export const INSTRUMENT_ALIASES = {
  'guitare acoustique':['acoustic guitar','guitare folk','guitare sèche'],
  'guitare électrique':['electric guitar'],
  'basse':['bass guitar','guitare basse'],
  'flûte traversière':['flute','concert flute'],
  'flûte à bec':['recorder'],
  'clarinette':['clarinet'],
  'saxophone':['sax','saxophone alto','saxophone ténor'],
  'trompette':['trumpet'],
  'trombone':['trombone'],
  'violon':['violin'],
  'violoncelle':['cello'],
  'contrebasse':['double bass'],
  'caisse claire':['snare','snare drum'],
  'grosse caisse':['kick','bass drum'],
  'charleston':['hi-hat','hihat'],
  'harmonica':['mouth organ'],
  'mélodica':['melodica'],
  'guimbarde':['jaw harp'],
  'ocarina':['ocarina']
}

export function instrumentVocabulary(extraTerms=[]){
  const rows=[]
  for(const family of INSTRUMENT_FAMILIES){
    for(const name of family.terms) rows.push({name,family:family.label,aliases:INSTRUMENT_ALIASES[name]||[],source:'registre MISES'})
  }
  for(const term of extraTerms||[]){
    const name=String(term||'').trim()
    if(name&&!rows.some(row=>row.name.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr'))) rows.push({name,family:'Enrichi par la base',aliases:[],source:'Data Bruitage'})
  }
  return rows
}
