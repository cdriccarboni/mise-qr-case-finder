import { normalize } from './data-bruitage.js'
import { locateObject, proposeVibe, PUBLIC_TECHNIQUES } from './vibe-engine.js'

const COUNTS = { deux: 2, trois: 3, quatre: 4, cinq: 5 }

function stripLead(text) {
  return String(text || '').replace(/^.*?(?:pour faire|faire entendre|bruit de|bruit d['’]|fa[cç]ons? de faire|mani[eè]res?(?: différentes)? de faire)\s*/i, '').replace(/[?.!]/g, '').trim()
}
export function extractContainer(text) {
  const match = String(text || '').match(/(?:valise|caisse|bo[iî]te|sac|flight-case|trousse|kit|contenant)\s+([^?:,.]*)/i)
  return match ? match[0].replace(/[?.!]/g, '').trim() : ''
}
function countFrom(text) {
  const match = normalize(text).match(/\b(\d+|deux|trois|quatre|cinq)\b/)
  if (!match) return 3
  return COUNTS[match[1]] || Number(match[1]) || 3
}
export function parseIntent(text) {
  const raw = String(text || '').trim()
  const n = normalize(raw)
  if (!n) return null
  if (/scanne|ce qu il y a devant/.test(n) && /exercice|cinq minutes|5 minutes/.test(n)) return { type: 'scan-exercise', minutes: /cinq|5/.test(n) ? 5 : 1, raw }
  if (/^(ou est|ou se trouve|ou sont)\b/.test(n) || n.startsWith('ou est')) return { type: 'where', query: stripLead(raw.replace(/^où est\s+/i, '').replace(/^ou est\s+/i, '')), raw }
  if (/qu est ce que j ai dans|contenu de/.test(n) || (/dans la |dans le |dans ma |dans mon /.test(n) && /valise|caisse|boite|sac|kit|contenant/.test(n))) return { type: 'contents', container: extractContainer(raw), raw }
  if (/manque/.test(n) && /mise|soir|spectacle/.test(n)) return { type: 'missing-mise', raw }
  if (/uniquement|avec moi/.test(n)) return { type: 'scoped-vibe', container: extractContainer(raw), prompt: raw, raw }
  if (/facons|manieres/.test(n)) return { type: 'ways', count: countFrom(raw), query: stripLead(raw), raw }
  if (/avec quoi|bruit de|bruit d /.test(n)) return { type: 'with-what', query: stripLead(raw), raw }
  const words = n.split(' ').filter(Boolean)
  if (words.length >= 4) return { type: 'vibe', prompt: raw, raw }
  return null
}
function findContainer(name, cases) {
  const wanted = normalize(name)
  if (!wanted) return null
  return (cases || []).find(item => {
    const label = normalize(item.name)
    return label && (wanted.includes(label) || label.includes(wanted))
  }) || null
}
function searchObjects(query, objects) {
  const words = normalize(query).split(' ').filter(word => word.length > 2 && !['mon', 'ton', 'pour', 'faire', 'avec', 'dans', 'truc', 'quoi', 'peut'].includes(word))
  return (objects || []).map(object => {
    const hay = normalize([object.name, object.hear, object.imagine, object.family, ...(object.sounds || []), ...(object.aliases || []), ...(object.tags || [])].join(' '))
    const score = words.reduce((sum, word) => sum + (hay.includes(word) ? 1 : 0), 0)
    return { object, score }
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score)
}
function ownedLine(object, cases, detail) {
  return { owned: true, title: object.name, location: locateObject(object, cases), detail, objectId: object.id }
}
function suggestedLine(title, detail) {
  return { owned: false, title, detail, source: 'Bibliothèque publique de techniques' }
}
export function answerIntent(intent, ctx = {}) {
  const objects = ctx.objects || []
  const cases = ctx.cases || []
  const learnings = ctx.learnings || []
  if (!intent) return null
  if (intent.type === 'where' || intent.type === 'with-what') {
    const found = searchObjects(intent.query, objects)
    const techniques = PUBLIC_TECHNIQUES.filter(item => normalize(`${item.name} ${item.detail} ${item.serves.join(' ')}`).includes(normalize(intent.query).split(' ').pop() || ''))
    return {
      type: intent.type,
      lead: found.length ? 'Voici ce qui est dans ta base, avec l’endroit.' : 'Je n’ai pas trouvé cet usage dans ta base.',
      owned: found.map(item => ownedLine(item.object, cases, [item.object.hear && `Entendre : ${item.object.hear}`, item.object.imagine && `Imaginer : ${item.object.imagine}`].filter(Boolean).join(' · '))),
      suggested: techniques.map(item => suggestedLine(item.name, item.detail)),
      uncertain: found.length ? [] : ['Correspondance incertaine : rien dans les fiches ne porte ces mots.'],
      action: null
    }
  }
  if (intent.type === 'contents') {
    const container = findContainer(intent.container, cases)
    if (!container) return { type: intent.type, lead: 'Je ne vois pas ce contenant dans ta base.', owned: [], suggested: [], uncertain: [`Contenant introuvable : « ${intent.container || 'sans nom'} ».`], action: null }
    const inside = objects.filter(object => (object.caseId || object.container_id) === container.id)
    return {
      type: intent.type,
      lead: `Dans ${container.name}, fiches possédées.`,
      owned: inside.map(object => ownedLine(object, cases, object.hear || object.imagine || '')),
      suggested: [],
      uncertain: inside.length ? [] : ['La caisse est vide, ou les objets ne sont pas encore rangés dedans.'],
      action: null
    }
  }
  if (intent.type === 'missing-mise') {
    const mise = (ctx.mises || []).find(item => item.id === ctx.activeMise) || (ctx.mises || [])[0]
    if (!mise) return { type: intent.type, lead: 'Aucune mise n’est ouverte.', owned: [], suggested: [], uncertain: ['Crée ou active une mise pour savoir ce qui manque.'], action: null }
    const rows = (mise.objectIds || []).map(id => objects.find(object => object.id === id)).filter(Boolean)
    const missing = rows.filter(object => !(mise.checked || []).includes(object.id))
    return {
      type: intent.type,
      lead: `Mise « ${mise.name} ». Ce qui n’est pas encore coché.`,
      owned: missing.map(object => ownedLine(object, cases, 'Pas encore coché dans la mise')),
      suggested: [],
      uncertain: missing.length ? [] : ['Rien n’est signalé manquant dans cette mise.'],
      action: null
    }
  }
  if (intent.type === 'scoped-vibe') {
    const container = findContainer(intent.container, cases)
    const scoped = container ? objects.filter(object => (object.caseId || object.container_id) === container.id) : []
    const vibe = proposeVibe(intent.prompt, scoped, cases, learnings)
    const uncertain = [...vibe.uncertain]
    if (!container) uncertain.unshift('Je n’ai pas reconnu le contenant. Je ne prétends pas que tu as ces objets avec toi.')
    return {
      type: intent.type,
      lead: container ? `Avec seulement ${container.name}.` : 'Contenant non reconnu.',
      vibe,
      owned: vibe.proposals.flatMap(item => item.lines).filter(line => line.owned).map(line => ({ owned: true, title: line.objectName, location: line.location, detail: line.gesture, objectId: line.objectId })),
      suggested: vibe.ifYouHave,
      uncertain,
      action: null
    }
  }
  if (intent.type === 'ways' || intent.type === 'vibe') {
    const vibe = proposeVibe(intent.prompt || intent.query || intent.raw, objects, cases, learnings)
    const wanted = intent.count || 3
    const owned = vibe.proposals.slice(0, wanted).flatMap(item => item.lines).filter(line => line.owned).map(line => ({ owned: true, title: line.objectName, location: line.location, detail: `${line.gestureLabel} : ${line.gesture}`, objectId: line.objectId }))
    return {
      type: intent.type,
      lead: vibe.universe ? `Univers reconnu : ${vibe.universe.title}. Moteur local, hors ligne.` : 'Pas d’univers assez clair.',
      vibe,
      owned,
      suggested: vibe.ifYouHave,
      uncertain: vibe.uncertain,
      action: null
    }
  }
  if (intent.type === 'scan-exercise') {
    return {
      type: intent.type,
      lead: `Je peux proposer un exercice de ${intent.minutes} minutes à partir de ce que la photo montre. Rien n’est inventé tant qu’aucun objet n’est vu.`,
      owned: [],
      suggested: [],
      uncertain: [],
      action: 'scan-exercise',
      minutes: intent.minutes
    }
  }
  return null
}
