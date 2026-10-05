#!/usr/bin/env node
/**
 * Rebuild public/public-foley.json from a MISES! V5 workbook.
 * Only EXPORT_PUBLIC_WEB (+ FABRICATIONS / SOURCES marked PUBLIC_WEB) enter the public pack.
 * PRIVE_ONLY and MIXTE private proofs never leave this script into the published JSON.
 *
 * Usage:
 *   node scripts/build-public-foley-from-xlsx.mjs /path/to/workbook.xlsx
 *   node scripts/build-public-foley-from-xlsx.mjs /path/to/workbook.xlsx --out public/public-foley.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { APP_VERSION } from '../src/version.js'

const args = process.argv.slice(2).filter(a => a !== '--')
const outIdx = args.indexOf('--out')
const outPath = outIdx >= 0 ? args[outIdx + 1] : 'public/public-foley.json'
const xlsxPath = args.find((a, i) => i !== outIdx && i !== outIdx + 1)
if (!xlsxPath) {
  console.error('Usage: node scripts/build-public-foley-from-xlsx.mjs <workbook.xlsx> [--out public/public-foley.json]')
  process.exit(1)
}

function sheetRows(book, name) {
  const sheet = book.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
}

function parseList(value) {
  if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean)
  const text = String(value ?? '').trim()
  if (!text) return []
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed.map(String).map(s => s.trim()).filter(Boolean)
    } catch { /* fall through */ }
  }
  return text.split(/\s*\|\s*|\s*;\s*|\s*\+\s*/).map(s => s.trim()).filter(Boolean)
}

function isPublicScope(value) {
  return String(value || '').trim().toUpperCase() === 'PUBLIC_WEB'
}

function onlyPublicProofIds(ids) {
  return (ids || []).filter(id => {
    const s = String(id)
    return s.startsWith('PRVWEB') || s.startsWith('PRV4-') || s.startsWith('PUB')
  })
}

function cleanText(value) {
  const text = String(value ?? '').replace(/\u00a0/g, ' ').trim()
  return text
}

const previous = JSON.parse(readFileSync(new URL('../public/public-foley.json', import.meta.url), 'utf8'))
const book = XLSX.read(readFileSync(resolve(xlsxPath)), { type: 'buffer', cellDates: false, raw: false })

const exportRows = sheetRows(book, 'EXPORT_PUBLIC_WEB').filter(row => isPublicScope(row.publication_scope))
if (!exportRows.length) {
  console.error('EXPORT_PUBLIC_WEB vide ou sans PUBLIC_WEB — abandon pour éviter un pack public incorrect.')
  process.exit(2)
}

const recipesById = new Map()
for (const row of sheetRows(book, 'API_MISES')) {
  if (!isPublicScope(row.publication_scope)) continue
  recipesById.set(String(row.recipe_id), row)
}

const fabrications = sheetRows(book, 'FABRICATIONS')
  .filter(row => isPublicScope(row.publication_scope))
  .map(row => ({
    id: String(row.id),
    name: cleanText(row.nom),
    materials: parseList(row.materiaux),
    assembly: cleanText(row.notice_source),
    use: cleanText(row.jeu),
    level: 'Très simple',
    status: cleanText(row.statut) || 'À tester terrain',
    sourceId: '',
    sourceUrl: '',
    publicationScope: 'PUBLIC_WEB'
  }))

const sources = sheetRows(book, 'SOURCES')
  .filter(row => isPublicScope(row.publication_scope))
  .map(row => ({
    id: String(row.id),
    name: cleanText(row.fichier).split('—')[0].trim() || cleanText(row.fichier),
    title: cleanText(row.fichier),
    url: cleanText(row.chemin),
    type: 'Guide / recettes'
  }))
  .filter(row => /^https?:\/\//i.test(row.url))

const sourceById = new Map(sources.map(s => [s.id, s]))

// Attach source URLs onto fabrications via EXPORT / preuve when possible
const fabSourceUrl = new Map()
for (const row of exportRows) {
  if (row.fabrication_id && row.source_url) fabSourceUrl.set(String(row.fabrication_id), cleanText(row.source_url))
  if (row.fabrication_id && row.source_id) {
    const fab = fabrications.find(f => f.id === String(row.fabrication_id))
    if (fab && !fab.sourceId) fab.sourceId = cleanText(row.source_id)
  }
}
for (const fab of fabrications) {
  fab.sourceUrl = fabSourceUrl.get(fab.id) || sourceById.get(fab.sourceId)?.url || ''
}

const records = exportRows.map(row => {
  const recipe = recipesById.get(String(row.technique_id)) || null
  const objects = parseList(row.objets)
  const record = {
    id: String(row.public_record_id),
    soundId: String(row.bruitage_id || ''),
    sound: cleanText(row.son),
    objects,
    technique: cleanText(row.technique),
    fabrication: cleanText(row.objet_a_fabriquer) || null,
    sourceId: cleanText(row.source_id),
    sourceUrl: cleanText(row.source_url),
    sourceRef: cleanText(row.source_repere),
    proofId: cleanText(row.preuve_id),
    validation: String(row.validation_terrain).toLowerCase() === 'true' ? 'terrain' : 'web-documented',
    publicationScope: 'PUBLIC_WEB'
  }
  if (recipe) {
    const recipeFields = {
      recipeId: cleanText(recipe.recipe_id),
      materialsMin: cleanText(recipe.materials_min) || null,
      materialsOptimal: cleanText(recipe.materials_optimal) || null,
      preparation: cleanText(recipe.preparation) || null,
      steps: cleanText(recipe.steps) || null,
      variants: cleanText(recipe.variants) || null,
      surfaceContext: cleanText(recipe.surface_context) || null,
      capture: cleanText(recipe.capture) || null,
      micPerspective: cleanText(recipe.mic_perspective) || null,
      passes: cleanText(recipe.passes) || null,
      troubleshooting: cleanText(recipe.troubleshooting) || null,
      quickRecipe: cleanText(recipe.quick_recipe) || null,
      difficulty: cleanText(recipe.difficulty) || null,
      prepTime: cleanText(recipe.prep_time) || null,
      soundGoal: cleanText(recipe.sound_goal) || null,
      confidence: cleanText(recipe.confidence) || null
    }
    // Drop empty recipe fields to keep the payload lean.
    for (const [key, value] of Object.entries(recipeFields)) {
      if (value) record[key] = value
    }
  }
  return record
})

// Safety: refuse if any private marker slipped into the publishable body.
const published = JSON.stringify({ records, fabrications, sources })
if (/PRIVE_ONLY|PRIVE_UTILISATEUR|MIXTE_PRIVE_WEB/.test(published)) {
  console.error('Marqueur privé détecté dans le pack public — abandon.')
  process.exit(3)
}
if (records.some(r => !/^https?:\/\//i.test(r.sourceUrl))) {
  console.error('Recette publique sans URL source — abandon.')
  process.exit(4)
}

const today = new Date().toISOString().slice(0, 10)
const payload = {
  schema: 'mises-public-foley/v1',
  version: APP_VERSION,
  generatedOn: today,
  publicationScope: 'PUBLIC_WEB',
  rules: [
    'Aucune donnée PRIVE_ONLY dans ce paquet.',
    "Une recette publique n'implique jamais que l'objet est possédé.",
    'Les URLs sources restent attachées aux recettes et fabrications.',
    "validationTerrain reste false jusqu'à validation locale.",
    'Seule la feuille EXPORT_PUBLIC_WEB (et FABRICATIONS/SOURCES PUBLIC_WEB) alimente ce fichier.'
  ],
  records,
  fabrications,
  games: previous.games,
  pedagogyActivities: previous.pedagogyActivities,
  universeFrames: previous.universeFrames,
  sources,
  active: true,
  integration: {
    mode: 'runtime',
    entrypoint: './public-foley.json',
    loadedBy: 'src/main.js',
    features: ['recherche publique', 'fabrications', 'jeux', 'activités pédagogiques', 'univers aléatoire', 'recettes enrichies'],
    privateCorpusIncluded: false
  },
  counts: {
    records: records.length,
    fabrications: fabrications.length,
    games: previous.games.length,
    pedagogyActivities: previous.pedagogyActivities.length,
    universeFrames: previous.universeFrames.length,
    sources: sources.length
  }
}

writeFileSync(resolve(outPath), JSON.stringify(payload, null, 2) + '\n')
console.log(JSON.stringify({
  ok: true,
  out: resolve(outPath),
  records: records.length,
  fabrications: fabrications.length,
  sources: sources.length,
  enrichedRecipes: records.filter(r => r.recipeId).length
}, null, 2))
