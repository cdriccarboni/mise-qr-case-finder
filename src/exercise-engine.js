export const EXERCISE_MODES = [
  ['decouverte', 'Découverte'],
  ['echauffement', 'Échauffement'],
  ['improvisation', 'Improvisation'],
  ['contrainte', 'Contrainte'],
  ['defi', 'Défi'],
  ['ambiance', 'Création d’ambiance'],
  ['histoire', 'Histoire sonore'],
  ['detournement', 'Détournement d’objet'],
  ['meme-objet', 'Même objet, plusieurs sons'],
  ['plusieurs-un-son', 'Plusieurs objets, un seul son']
]

export function durationLabel(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return '1 min'
  if (value < 1) return `${Math.round(value * 60)} secondes`
  return Number.isInteger(value) ? `${value} min` : `${value} min`
}

function namesOf(objects) {
  return [...new Set((objects || []).map(object => String(object?.name || object || '').trim()).filter(Boolean))]
}
function exercise(mode, names, options, steps) {
  const text = steps.join(' ')
  if (!names.length) throw new Error('Exercice sans objet')
  return {
    mode, title: EXERCISE_MODES.find(item => item[0] === mode)?.[1] || mode,
    duration: durationLabel(options.durationMin),
    participants: options.participants,
    level: options.level,
    universe: options.universe || '',
    provenance: 'generated',
    disclaimer: 'Proposition générée. Ce n’est pas une fiche de ta base.',
    objectsUsed: names.filter(name => text.includes(name)),
    steps
  }
}

function build(mode, names, options) {
  const [first, second] = names
  const all = names.join(', ')
  const people = options.participants
  const level = options.level
  const universe = options.universe ? ` Univers demandé : ${options.universe}.` : ''
  const who = people > 1 ? `Répartissez-vous ${people} : une personne par geste.` : 'Une personne suffit.'
  const pace = level === 'avancé' ? 'Faites se chevaucher les gestes.' : 'Laissez entendre chaque geste séparément.'
  if (mode === 'decouverte') return exercise(mode, names, options, [
    `Écoutez ${first} sans parler, puis nommez le son que vous entendez vraiment.`,
    people > 1 ? `Les autres regardent seulement ${all}.` : `Gardez ${all} devant vous.`,
    pace + universe
  ])
  if (mode === 'echauffement') return exercise(mode, names, options, [
    `Passez ${first} de main en main. Chaque personne fait un son très doux, une fois.`,
    names[1] ? `Puis le même tour avec ${names.slice(1).join(', ')}.` : `Refaites le tour avec un autre geste sur ${first}.`,
    who
  ])
  if (mode === 'improvisation') return exercise(mode, names, options, [
    `Improvistez ${durationLabel(options.durationMin)} en ne touchant que : ${all}.`,
    pace,
    who + universe
  ])
  if (mode === 'contrainte') return exercise(mode, names, options, [
    `Contrainte : seulement ${all}, pas de voix, pas d’autre objet.`,
    `Tenez ${durationLabel(options.durationMin)}. ${pace}`,
    who
  ])
  if (mode === 'defi') return exercise(mode, names, options, [
    `Défi : en ${durationLabel(options.durationMin)}, faites entendre un lieu avec uniquement ${all}.`,
    pace,
    who + universe
  ])
  if (mode === 'ambiance') return exercise(mode, names, options, [
    `Posez une ambiance en couches avec ${all}.`,
    `${first} tient le fond. ${names.slice(1).join(', ') || first} entre par moments.`,
    pace + universe
  ])
  if (mode === 'histoire') return exercise(mode, names, options, [
    `Histoire sonore en trois temps avec ${all}.`,
    `Début : ${first} tout doux. Milieu : tout le monde. Fin : un seul geste, puis silence.`,
    who + universe
  ])
  if (mode === 'detournement') return exercise(mode, names, options, [
    `Détournez ${first} : jouez-le comme s’il était autre chose. Ceci est une image, pas un objet de plus.`,
    names[1] ? `${second} reste lui-même et répond.` : `Trois façons différentes, toujours avec ${first}.`,
    'Suggestion de jeu. Ce n’est pas une fiche possédée.'
  ])
  if (mode === 'meme-objet') return exercise(mode, names, options, [
    `Gardez uniquement ${first}. Trois sons : frotter, taper du bout des doigts, secouer près de l’oreille.`,
    names.length > 1 ? `Les autres objets vus (${names.slice(1).join(', ')}) restent au sol.` : `Ne prenez rien d’autre.`,
    who
  ])
  return exercise(mode, names, options, [
    `Un seul son, porté par ${all}.`,
    `Chacun ajoute une couche au même événement, sans en inventer un deuxième.`,
    pace + who + universe
  ])
}

export function generateExercises(input = {}) {
  const names = namesOf(input.objects)
  const options = {
    durationMin: input.durationMin ?? 1,
    participants: Math.max(1, Number(input.participants) || 1),
    level: input.level || 'atelier',
    universe: input.universe || ''
  }
  if (!names.length) {
    return { exercises: [], uncertain: ['Aucun objet fourni : je ne propose pas d’objet inventé.'], provenance: 'generated' }
  }
  const requested = input.mode ? [input.mode] : EXERCISE_MODES.map(item => item[0])
  const exercises = []
  for (const mode of requested) {
    exercises.push(build(mode, names, options))
    if (input.mode && exercises.length >= (input.count || 3)) break
    if (!input.mode && exercises.length >= (input.count || 4)) break
  }
  for (const item of exercises) {
    for (const used of item.objectsUsed) if (!names.includes(used)) throw new Error('Objet hors liste')
  }
  return {
    exercises, uncertain: [], provenance: 'generated',
    disclaimer: 'Proposition générée. Ce n’est pas une fiche de ta base.',
    seen: names
  }
}

export function handsChallenges(labels) {
  const names = namesOf(labels)
  if (!names.length) return { challenges: [], seen: [], uncertain: ['Rien de visible à utiliser. Je n’invente pas d’objet.'], provenance: 'generated' }
  const list = names.join(', ')
  const first = names[0]
  const challenges = [
    { title: 'Cuisine inquiétante', duration: '30–60 s', steps: [`Uniquement avec : ${list}.`, `Un fond lent avec ${first}.`, 'Un geste sec, puis un silence.'] },
    { title: 'Une créature arrive', duration: '1 min', steps: [`La créature n’est pas un objet de plus : elle naît de ${list}.`, `Commencez loin (${first} très doux), approchez, arrêtez-vous.`] },
    { title: 'Tempête miniature', duration: '1 min', steps: [`Avec ${list} seulement.`, 'Trois plans : vent, impact, accalmie.'] },
    { title: 'Même objet, trois sons', duration: '45 s', steps: [`Gardez uniquement ${first}.`, 'Frotter, taper du bout des doigts, secouer près de l’oreille.', names.length > 1 ? `Laissez ${names.slice(1).join(', ')} au sol.` : 'Rien d’autre dans les mains.'] }
  ]
  return { challenges, seen: names, uncertain: [], provenance: 'generated', disclaimer: 'Défis générés à partir des objets vus. Pas des fiches de ta base.' }
}

const FRAMES = [
  ['Quai de gare', 'Les objets vus deviennent le quai.'],
  ['Cuisine nocturne', 'La pièce est vide : seulement ce qui est devant toi.'],
  ['Atelier mécanique', 'Chaque objet vu est une pièce de machine.'],
  ['Bateau', 'Le pont tient dans les objets vus.'],
  ['Forêt étrange', 'Le sol de la forêt est fait de ces objets.'],
  ['Tempête', 'La tempête passe par ces objets, un par un.'],
  ['Petite machine fantastique', 'Ces objets forment une seule petite machine.']
]
export function sightUniverses(labels) {
  const names = namesOf(labels)
  if (!names.length) return { scenarios: [], uncertain: ['Aucun objet visible : pas d’univers inventé à partir de rien.'], provenance: 'generated' }
  return {
    provenance: 'generated',
    intro: 'Avec ce que je vois, voici quelques univers que tu pourrais essayer',
    uncertain: [],
    scenarios: FRAMES.map(([title, lead]) => ({
      title, lead, owned: false, provenance: 'generated',
      steps: names.map(name => `${name} : un geste simple, dans « ${title} ». Suggestion, pas un objet de plus.`)
    }))
  }
}
