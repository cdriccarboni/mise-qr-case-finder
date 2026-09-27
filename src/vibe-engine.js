import { normalize } from './data-bruitage.js'
import { learningBoost } from './learning.js'

// Local, transparent lexicon. A line is owned only when it cites a real fiche.
export const PUBLIC_TECHNIQUES = [
  { id: 'survie', name: 'Couverture de survie', serves: ['feu', 'pluie', 'vent', 'tempete', 'foret'], detail: 'La secouer très lentement : averse fine ou feuillage métallique.' },
  { id: 'billes', name: 'Billes ou graines dans une boîte', serves: ['pluie', 'port', 'quai', 'sabots'], detail: 'Incliner la boîte par à-coups : gravier, pluie, ou sabots au loin.' },
  { id: 'gants', name: 'Gants de vaisselle', serves: ['pas', 'sabots', 'creature'], detail: 'Frotter les paumes : pas feutrés, ou un animal qui s’approche.' },
  { id: 'ballon', name: 'Ballon peu gonflé', serves: ['vent', 'mer', 'bateau', 'tempete'], detail: 'Pincer le col et laisser filer l’air : rafale ou gréement.' },
  { id: 'papier', name: 'Papier ou journal', serves: ['feu', 'foret', 'maison'], detail: 'Froisser, déchirer, tapoter : feu, feuilles, ou une maison qui travaille.' },
  { id: 'chaine', name: 'Chaîne ou trousseau', serves: ['port', 'bateau', 'machine', 'tonnerre'], detail: 'Laisser tomber maillon par maillon, ou secouer loin du micro.' }
]

export const UNIVERSES = [
  {
    id: 'foret-nuit', title: 'Forêt inquiétante la nuit', triggers: ['foret', 'bois', 'nuit', 'rode', 'inquiet'],
    rhythm: 'Lent, irrégulier, avec de longs silences.',
    components: [
      { role: 'sol', hear: 'feuilles', imagine: 'sous-bois', keywords: ['papier', 'feuille', 'tissu'], gesture: 'Froisser très lentement, par petites touches.', other: 'Même geste, mais plus sec, comme une brindille.' },
      { role: 'présence', hear: 'pas feutrés', imagine: 'quelque chose qui rôde', keywords: ['gant', 'semelle', 'tissu', 'chaine', 'chausson'], gesture: 'Deux doigts décalés, puis un arrêt.', other: 'Un seul pas, très espacé.' },
      { role: 'air', hear: 'souffle', imagine: 'vent dans les cimes', keywords: ['bouteille', 'tuyau', 'ventilateur', 'ballon'], gesture: 'Souffler près du micro, ouvrir et fermer la main.', other: 'Souffle plus court, comme une rafale entre les troncs.' },
      { role: 'alerte', hear: 'craquement', imagine: 'branche', keywords: ['bois', 'baton', 'branche', 'craquant'], gesture: 'Tordre un objet sec une seule fois.', other: 'Un craquement loin, presque manqué.' }
    ]
  },
  {
    id: 'vieille-maison', title: 'Vieille maison dans la tempête', triggers: ['vieille maison', 'maison', 'tempete', 'travail', 'charpente'],
    rhythm: 'Coups espacés, puis une rafale, puis le bois qui revient.',
    components: [
      { role: 'charpente', hear: 'craquement long', imagine: 'poutre', keywords: ['bois', 'chaise', 'baton', 'caisse'], gesture: 'Appuyer lentement jusqu’au craquement, relâcher.', other: 'Petits clics de bois qui joue.' },
      { role: 'vent', hear: 'sifflement', imagine: 'courant d’air', keywords: ['bouteille', 'tuyau', 'ballon', 'fenetre'], gesture: 'Souffler dans un col, varier l’ouverture.', other: 'Souffle filtré entre les dents, très fin.' },
      { role: 'pluie', hear: 'pluie sur vitre', imagine: 'averse', keywords: ['papier', 'mais', 'bille', 'graine', 'couverture'], gesture: 'Tapoter irrégulièrement avec les ongles.', other: 'Une averse plus dense, puis un trou.' },
      { role: 'volet', hear: 'claquement', imagine: 'volet', keywords: ['carton', 'livre', 'couvercle', 'caisse'], gesture: 'Un carton qui claque une fois, tenu près du micro.', other: 'Le même coup, loin, étouffé.' }
    ]
  },
  {
    id: 'bateau', title: 'Bateau en bois dans une mer violente', triggers: ['bateau', 'mer', 'ocean', 'vague', 'houle', 'bois'],
    rhythm: 'Houle en trois temps : montée, impact, retrait.',
    components: [
      { role: 'coque', hear: 'grincement de coque', imagine: 'bordé', keywords: ['bois', 'chaise', 'caisse', 'rame'], gesture: 'Tordre deux pièces l’une contre l’autre.', other: 'Un grincement plus aigu, plus court.' },
      { role: 'eau', hear: 'paquet de mer', imagine: 'vague', keywords: ['bouteille', 'seau', 'verre', 'eau', 'bassine'], gesture: 'Agiter un fond d’eau, puis un coup plus large.', other: 'Seulement le clapot, sans l’impact.' },
      { role: 'gréement', hear: 'gréement', imagine: 'cordage', keywords: ['chaine', 'corde', 'cle', 'tissu'], gesture: 'Faire glisser une chaîne ou une corde par à-coups.', other: 'Un seul maillon, très lent.' },
      { role: 'vent', hear: 'rafale', imagine: 'vent de mer', keywords: ['ballon', 'bouteille', 'tuyau'], gesture: 'Laisser filer l’air par bouffées.', other: 'Une rafale unique, puis le silence.' }
    ]
  },
  {
    id: 'port', title: 'Ambiance de port', triggers: ['port', 'quai', 'dock', 'marin'],
    rhythm: 'Clapot régulier, événements rares (chaîne, cri lointain).',
    components: [
      { role: 'eau', hear: 'clapot', imagine: 'coque contre le quai', keywords: ['bouteille', 'verre', 'seau', 'eau'], gesture: 'Petit clapot régulier, très près.', other: 'Le même clapot, plus lent.' },
      { role: 'métal', hear: 'chaîne', imagine: 'aussière', keywords: ['chaine', 'cle', 'metal', 'clou'], gesture: 'Poser la chaîne maillon par maillon.', other: 'Un choc métallique unique, loin.' },
      { role: 'bois', hear: 'ponton', imagine: 'planches', keywords: ['bois', 'caisse', 'planche'], gesture: 'Frotter deux bois dans le rythme de la houle.', other: 'Un pas sur le ponton.' }
    ]
  },
  {
    id: 'pluie', title: 'Pluie', triggers: ['pluie', 'averse', 'bruine'],
    rhythm: 'Dense puis éclaircie.',
    components: [
      { role: 'gouttes', hear: 'gouttes', imagine: 'pluie', keywords: ['papier', 'mais', 'bille', 'graine', 'couverture', 'bouteille'], gesture: 'Tapoter vite et irrégulier, puis alléger.', other: 'Quelques gouttes seulement.' }
    ]
  },
  {
    id: 'tonnerre', title: 'Tonnerre', triggers: ['tonnerre', 'orage', 'foudre'],
    rhythm: 'Un grondement long, pas un coup sec.',
    components: [
      { role: 'grondement', hear: 'grondement', imagine: 'tonnerre', keywords: ['carton', 'caisse', 'tôle', 'tole', 'couverture', 'chaine', 'plaque'], gesture: 'Tenir une grande surface et la faire onduler loin du micro.', other: 'Le même geste, encore plus loin, presque un souvenir.' }
    ]
  },
  {
    id: 'sabots', title: 'Sabots de cheval', triggers: ['sabot', 'cheval', 'galop', 'trot'],
    rhythm: 'Deux temps (trot) ou trois temps (galop), jamais mécanique.',
    components: [
      { role: 'sabots', hear: 'sabots', imagine: 'cheval', keywords: ['noix', 'coquille', 'bois', 'godet', 'gant', 'tasse'], gesture: 'Deux frappes alternées sur une surface creuse.', other: 'Le galop s’éloigne : plus étouffé, plus lent.' }
    ]
  },
  {
    id: 'cuisine', title: 'Cuisine nocturne', triggers: ['cuisine', 'verre', 'cuillere', 'cle'],
    rhythm: 'Gestes domestiques, un peu trop lents.',
    components: [
      { role: 'vaisselle', hear: 'verre', imagine: 'cuisine vide', keywords: ['verre', 'tasse', 'bol', 'bouteille'], gesture: 'Faire tourner un objet dans un verre, très lentement.', other: 'Un seul tintement, puis attendre.' },
      { role: 'couvert', hear: 'métal léger', imagine: 'tiroir', keywords: ['cuillere', 'fourchette', 'cle', 'couteau'], gesture: 'Poser le couvert, ne pas le jeter.', other: 'Le faire glisser sur la table.' }
    ]
  },
  {
    id: 'quai', title: 'Quai de gare', triggers: ['gare', 'quai', 'train'],
    rhythm: 'Attente, puis un passage.',
    components: [
      { role: 'salle', hear: 'murmure de salle', imagine: 'quai', keywords: ['papier', 'tissu', 'sac'], gesture: 'Frotter un tissu en continu, très bas.', other: 'Le frottement s’interrompt quand « le train » passe.' },
      { role: 'métal', hear: 'rail', imagine: 'train', keywords: ['chaine', 'cle', 'metal'], gesture: 'Une chaîne qui file une fois, de gauche à droite.', other: 'Le même passage, plus loin.' }
    ]
  },
  {
    id: 'atelier', title: 'Atelier mécanique', triggers: ['atelier', 'mecanique', 'machine', 'metal'],
    rhythm: 'Un geste régulier, puis une erreur.',
    components: [
      { role: 'métal', hear: 'métal', imagine: 'établi', keywords: ['cle', 'chaine', 'cuillere', 'outil', 'boulon'], gesture: 'Petit cycle régulier, puis un coup à côté.', other: 'Le cycle seul, sans l’erreur.' }
    ]
  },
  {
    id: 'tempete', title: 'Tempête', triggers: ['tempete', 'ouragan', 'orage'],
    rhythm: 'Montée, paroxysme court, accalmie.',
    components: [
      { role: 'vent', hear: 'rafale', imagine: 'tempête', keywords: ['ballon', 'bouteille', 'tuyau', 'tissu'], gesture: 'Rafales inégales.', other: 'Une seule rafale.' },
      { role: 'impact', hear: 'impact', imagine: 'objet projeté', keywords: ['caisse', 'carton', 'bois', 'chaine'], gesture: 'Un choc étouffé, pas un claquement nu.', other: 'Le choc très loin.' }
    ]
  },
  {
    id: 'machine', title: 'Petite machine fantastique', triggers: ['machine', 'fantastique', 'mecanisme'],
    rhythm: 'Petit moteur irrégulier, comme un jouet trop sérieux.',
    components: [
      { role: 'moteur', hear: 'cliquetis', imagine: 'mécanisme', keywords: ['cle', 'chaine', 'cuillere', 'bouton', 'verre'], gesture: 'Cycle court de trois bruits, répété, avec un raté.', other: 'Le même cycle, deux fois plus lent.' }
    ]
  }
]

function haystack(object) {
  return normalize([object?.name, object?.hear, object?.imagine, object?.family, object?.device, object?.notes, ...(object?.sounds || []), ...(object?.aliases || []), ...(object?.tags || []), ...(object?.contexts || [])].join(' '))
}
function scoreObject(object, keywords) {
  const hay = haystack(object)
  let score = 0
  for (const keyword of keywords || []) {
    const needle = normalize(keyword)
    if (needle && hay.includes(needle)) score += needle.length > 4 ? 2 : 1
  }
  return score
}
export function locateObject(object, cases) {
  const id = object?.caseId || object?.container_id || ''
  const found = (cases || []).find(item => item.id === id)
  return found?.name || (id ? id : 'sans contenant')
}
export function matchUniverse(prompt) {
  const text = normalize(prompt)
  let best = null, score = 0
  for (const universe of UNIVERSES) {
    const hits = universe.triggers.reduce((sum, trigger) => sum + (text.includes(normalize(trigger)) ? 1 : 0), 0)
    if (hits > score) { score = hits; best = universe }
  }
  return { universe: best, score }
}
function rank(component, objects, cases, learnings, universeId) {
  return (objects || []).map(object => ({
    object, location: locateObject(object, cases),
    score: scoreObject(object, component.keywords) + learningBoost(object.id, learnings, universeId)
  })).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.object.name.localeCompare(b.object.name, 'fr'))
}
function lineFrom(hit, component, gesture) {
  return {
    owned: true,
    role: component.role,
    objectId: hit.object.id,
    objectName: hit.object.name,
    location: hit.location,
    label: `${hit.object.name} — ${hit.location}`,
    hear: hit.object.hear || '',
    imagine: hit.object.imagine || '',
    gesture,
    gestureLabel: 'Geste suggéré'
  }
}
export function proposeVibe(prompt, objects = [], cases = [], learnings = []) {
  const { universe, score } = matchUniverse(prompt)
  const uncertain = []
  if (!universe || !score) {
    uncertain.push('Je ne reconnais pas assez le paysage pour proposer un univers. Décris-le avec des mots simples : forêt, maison, mer, port, pluie…')
    return { engine: 'lexique-local', offline: true, universe: null, proposals: [], ifYouHave: [], uncertain, provenance: 'generated' }
  }
  const pool = universe.components.map(component => ({ component, hits: rank(component, objects, cases, learnings, universe.id) }))
  function build(id, title, chooser) {
    const lines = []
    pool.forEach(({ component, hits }) => {
      const chosen = chooser(hits, component)
      if (chosen) lines.push(chosen)
    })
    return { id, title, rhythm: universe.rhythm, lines, provenance: 'generated' }
  }
  const general = build('A', 'Ambiance générale', (hits, component) => hits[0] ? lineFrom(hits[0], component, component.gesture) : null)
  const other = build('B', 'Autre approche', (hits, component) => {
    if (hits[1]) return lineFrom(hits[1], component, component.other || component.gesture)
    if (hits[0]) return lineFrom(hits[0], component, component.other || component.gesture)
    return null
  })
  const bestHit = pool.flatMap(item => item.hits.map(hit => ({ ...hit, component: item.component }))).sort((a, b) => b.score - a.score)[0]
  const minimal = {
    id: 'C', title: 'Minimal, une personne', rhythm: 'Un seul objet, trois intensités.', provenance: 'generated',
    lines: bestHit ? [{
      ...lineFrom(bestHit, bestHit.component, `Avec ${bestHit.object.name} seulement : doux, puis présent, puis loin. Une personne.`),
      gestureLabel: 'Geste suggéré'
    }] : []
  }
  const covered = new Set(general.lines.map(line => line.role))
  const ifYouHave = []
  for (const { component } of pool) {
    if (covered.has(component.role)) continue
    ifYouHave.push({
      owned: false,
      title: component.hear,
      detail: component.gesture,
      source: 'Piste du lexique local, pas un objet de ta base'
    })
  }
  const tags = new Set(universe.triggers.map(normalize))
  for (const technique of PUBLIC_TECHNIQUES) {
    if (technique.serves.some(tag => tags.has(normalize(tag)) || universe.id.includes(tag))) {
      ifYouHave.push({ owned: false, title: technique.name, detail: technique.detail, source: 'Bibliothèque publique de techniques' })
    }
  }
  if (!general.lines.length) uncertain.push('Aucun objet possédé ne correspond assez. Les pistes ci-dessous restent des suggestions.')
  return {
    engine: 'lexique-local', offline: true, universe: { id: universe.id, title: universe.title },
    proposals: [general, other, minimal], ifYouHave, uncertain, provenance: 'generated'
  }
}
