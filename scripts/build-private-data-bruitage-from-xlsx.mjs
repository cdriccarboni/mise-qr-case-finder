#!/usr/bin/env node
/**
 * Build a PRIVATE Data Bruitage import JSON for the owner only.
 * Includes PRIVE_ONLY (+ MIXTE entities for personal use). Never write the result into the public git tree.
 *
 * Usage:
 *   node scripts/build-private-data-bruitage-from-xlsx.mjs workbook.xlsx --out /workspace/private-mises/MISES-private-data-bruitage.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import * as XLSX from 'xlsx'

const args = process.argv.slice(2)
const outIdx = args.indexOf('--out')
const outPath = outIdx >= 0 ? args[outIdx + 1] : null
const xlsxPath = args.find((a, i) => i !== outIdx && i !== outIdx + 1)
if (!xlsxPath || !outPath) {
  console.error('Usage: node scripts/build-private-data-bruitage-from-xlsx.mjs <workbook.xlsx> --out <private.json>')
  process.exit(1)
}
if (outPath.includes('mise-qr-case-finder/public') || outPath.includes('/public/')) {
  console.error('Refus : ne pas écrire le pack privé dans public/.')
  process.exit(2)
}

function sheetRows(book, name) {
  const sheet = book.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
}
function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim()
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
function scopeOf(row) {
  return String(row.publication_scope || '').trim().toUpperCase()
}
function isPrivateOrMixed(scope) {
  return scope === 'PRIVE_ONLY' || scope === 'MIXTE'
}

const book = XLSX.read(readFileSync(resolve(xlsxPath)), { type: 'buffer', cellDates: false, raw: false })

const recipesByBruitage = new Map()
for (const row of sheetRows(book, 'API_MISES')) {
  if (scopeOf(row) !== 'PRIVE_ONLY') continue
  const key = cleanText(row.bruitage_id)
  if (!key) continue
  const list = recipesByBruitage.get(key) || []
  list.push(row)
  recipesByBruitage.set(key, list)
}

const objects = []
const sounds = []
const objectSounds = []
const sources = []
const review = []

for (const row of sheetRows(book, 'SOURCES')) {
  if (!isPrivateOrMixed(scopeOf(row))) continue
  sources.push({
    id: String(row.id),
    name: cleanText(row.fichier),
    format: cleanText(row.mode) || 'document',
    provenance: 'user-document',
    notes: `origine=${cleanText(row.origine_donnee)} · scope=${scopeOf(row)} · chemin local non publié`,
    publicationScope: scopeOf(row)
  })
}

const consultation = sheetRows(book, 'CONSULTATION').filter(row => scopeOf(row) === 'PRIVE_ONLY')
for (const row of consultation) {
  const relationId = cleanText(row.relation_id) || `rel-${objects.length + 1}`
  const objectId = `obj-${relationId}`
  const soundId = `snd-${relationId}`
  const son = cleanText(row.son)
  const technique = cleanText(row.technique)
  const objets = cleanText(row.objets)
  const recipes = recipesByBruitage.get(cleanText(row.relation_id).replace(/^REL-/, 'BRU-')) || []
  // Better: match via TECHNIQUES / RELATIONS
  let recipeNotes = ''
  const recipe = (recipesByBruitage.get('') || [])[0]
  void recipe
  // Find recipe via bruitages sheet mapping below after we have bruitage ids.

  objects.push({
    id: objectId,
    name: son || objets || relationId,
    hear: son,
    imagine: '',
    device: objets,
    family: 'Data Bruitage privé',
    source: cleanText(row.sources).slice(0, 240),
    status: cleanText(row.statut) || 'available',
    notes: technique,
    provenance: 'user-document',
    sounds: son ? [son] : [],
    owned: true,
    publicationScope: 'PRIVE_ONLY',
    relationId,
    tags: ['prive', 'data-bruitage-v5']
  })
  if (son) {
    sounds.push({
      id: soundId,
      name: son,
      hear: son,
      imagine: '',
      provenance: 'user-document',
      publicationScope: 'PRIVE_ONLY'
    })
    objectSounds.push({
      id: `link-${relationId}`,
      objectId,
      soundId,
      provenance: 'user-document'
    })
  }
}

// Enrich objects with API_MISES private recipes via RELATIONS → bruitage_id
const relations = sheetRows(book, 'RELATIONS').filter(row => scopeOf(row) === 'PRIVE_ONLY')
const relById = new Map(relations.map(r => [cleanText(r.id), r]))
for (const object of objects) {
  const rel = relById.get(object.relationId)
  if (!rel) continue
  const bruitageId = cleanText(rel.bruitage_id)
  const recipeRows = recipesByBruitage.get(bruitageId) || []
  if (!recipeRows.length) continue
  const recipe = recipeRows[0]
  const parts = [
    cleanText(recipe.quick_recipe),
    cleanText(recipe.materials_min) && `Matériel : ${cleanText(recipe.materials_min)}`,
    cleanText(recipe.preparation) && `Préparation : ${cleanText(recipe.preparation)}`,
    cleanText(recipe.steps) && `Geste : ${cleanText(recipe.steps)}`,
    cleanText(recipe.capture) && `Captation : ${cleanText(recipe.capture)}`
  ].filter(Boolean)
  if (parts.length) {
    object.notes = [object.notes, ...parts].filter(Boolean).join('\n\n')
    object.recipeId = cleanText(recipe.recipe_id)
  }
}

// Private fabrications → review notes (not invented as owned objects without confirmation)
for (const row of sheetRows(book, 'FABRICATIONS')) {
  if (scopeOf(row) !== 'PRIVE_ONLY') continue
  review.push({
    id: `review-fab-${row.id}`,
    table: 'objects',
    reason: 'Fabrication privée à qualifier dans la valise',
    status: 'pending',
    provenance: 'review',
    proposed: {
      id: `fab-obj-${row.id}`,
      name: cleanText(row.nom),
      device: parseList(row.materiaux).join(', '),
      notes: [cleanText(row.notice_source), cleanText(row.jeu)].filter(Boolean).join('\n\n'),
      provenance: 'user-document',
      owned: false,
      publicationScope: 'PRIVE_ONLY'
    }
  })
}

const payload = {
  schema: 'MISES-Data-Bruitage-v1',
  version: 2,
  exportedAt: new Date().toISOString(),
  publicationScope: 'PRIVE_ONLY',
  ownerHint: 'cdric.carboni@gmail.com',
  warning: 'Pack privé — ne pas committer dans le dépôt public MISES!.',
  objects,
  sounds,
  objectSounds,
  aliases: [],
  mises: [],
  cases: [],
  sources,
  review,
  corrections: [],
  kits: [],
  counts: {
    objects: objects.length,
    sounds: sounds.length,
    objectSounds: objectSounds.length,
    sources: sources.length,
    review: review.length
  }
}

mkdirSync(dirname(resolve(outPath)), { recursive: true })
writeFileSync(resolve(outPath), JSON.stringify(payload, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, out: resolve(outPath), ...payload.counts }, null, 2))
