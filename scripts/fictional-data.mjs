import { emptyData } from '../src/data-bruitage.js'

// Public fixture only. Every name is explicitly fictional.
export function fictionalData() {
  const data = emptyData()
  data.sources.push({
    id: 'source-fictif-001',
    name: 'FICTIF-carnet-bruitage.txt',
    format: 'txt',
    digest: 'fictif-public',
    provenance: 'user-document',
    kind: 'user-document',
    notes: 'Jeu de données fictif. Aucun document réel.'
  })
  data.cases.push({ id: 'case-fictif', name: 'Valise fictive' })
  data.objects.push(
    {
      id: 'obj-fictif-bouteille',
      name: 'Bouteille fictive',
      device: 'Bouteille en verre fictive',
      hear: 'glouglou fictif',
      imagine: 'océan imaginé fictif',
      family: 'Eau & liquides',
      sourceId: 'source-fictif-001',
      source: 'FICTIF-carnet-bruitage.txt',
      status: 'review',
      notes: 'Exemple public fictif. Entendre et imaginer restent séparés.',
      provenance: 'user-document',
      caseId: 'case-fictif',
      sounds: ['usage fictif distinct'],
      tags: ['fictif'],
      contexts: ['fictif'],
      owned: false
    },
    {
      id: 'obj-fictif-bouteille-2',
      name: 'Bouteille fictive',
      device: 'Seconde bouteille fictive',
      hear: 'clapotis fictif',
      imagine: 'pluie imaginée fictive',
      family: 'Eau & liquides',
      sourceId: 'source-fictif-001',
      source: 'FICTIF-carnet-bruitage.txt',
      status: 'available',
      notes: 'Doublon de nom volontaire, fiches distinctes.',
      provenance: 'user-document',
      sounds: [],
      tags: [],
      contexts: [],
      owned: false
    },
    {
      id: 'obj-fictif-papier',
      name: 'Papier froissé fictif',
      device: 'Feuille de papier fictive',
      hear: 'froissement fictif',
      imagine: 'feu imaginé fictif',
      family: 'Feu & textures',
      sourceId: 'source-fictif-001',
      source: 'FICTIF-carnet-bruitage.txt',
      status: 'available',
      notes: 'Ne pas recopier le son imaginé dans le son à entendre.',
      provenance: 'user-document',
      sounds: [],
      tags: [],
      contexts: [],
      owned: false
    }
  )
  data.sounds.push(
    { id: 'snd-fictif-glouglou', name: 'Glouglou fictif', hear: 'glouglou fictif', imagine: '', provenance: 'user-document', sourceId: 'source-fictif-001' },
    { id: 'snd-fictif-ocean', name: 'Océan imaginé fictif', hear: '', imagine: 'océan imaginé fictif', provenance: 'generated', sourceId: 'source-fictif-001', notes: 'Proposition générée fictive, pas un document source.' }
  )
  data.objectSounds.push(
    { id: 'rel-fictif-1', objectId: 'obj-fictif-bouteille', soundId: 'snd-fictif-glouglou' },
    { id: 'rel-fictif-2', objectId: 'obj-fictif-bouteille', soundId: 'snd-fictif-ocean' }
  )
  return data
}
