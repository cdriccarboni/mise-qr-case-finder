import * as XLSX from 'xlsx'
import * as codepages from 'xlsx/dist/cpexcel.full.mjs'
import { TABLES, emptyData, normalize, buildIndex, findDuplicates } from './data-bruitage.js'

XLSX.set_cptable(codepages)

const tableNames = Object.fromEntries(Object.entries(TABLES).flatMap(([key, name]) => [[normalize(key), key], [normalize(name), key]]))
Object.assign(tableNames, { containers: 'cases', object_sound_links: 'objectSounds', 'object sound links': 'objectSounds', 'elements a verifier': 'review' })
const fields = { nom: 'name', objet: 'name', article: 'name', son: 'name', identifiant: 'id', sons: 'sounds', alias: 'aliases', variantes: 'aliases', tags: 'tags', contexte: 'contexts', contextes: 'contexts', contenant: 'caseId', valise: 'caseId', caisse: 'caseId', localisation: 'location', emplacement: 'location', matiere: 'material', materiau: 'material', geste: 'gesture', technique: 'gesture', categorie: 'family', instrument: 'instrument', object_id: 'objectId', sound_id: 'soundId', 'object id': 'objectId', 'sound id': 'soundId', 'son a entendre': 'hear', 'son a imaginer': 'imagine', 'objet ou dispositif necessaire': 'device', famille: 'family', statut: 'status', notes: 'notes', provenance: 'provenance', source: 'source' }
const arrayFields = ['sounds', 'tags', 'contexts', 'aliases', 'objectIds', 'checked']
export const SUPPORTED_IMPORT = /\.(xlsx|xls|ods|csv|tsv|json|txt|md|markdown|pdf|docx|zip|png|jpe?g|webp)$/i
export async function sourceDigest(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('')
}
function decodeCell(value) {
  if (typeof value === 'string' && value.startsWith('json:')) return JSON.parse(value.slice(5))
  return value
}
async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Décompression ZIP indisponible sur ce navigateur')
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
async function unzipFiles(bytes) {
  const data = new Uint8Array(bytes), view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let eocd = -1
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Archive ZIP illisible')
  const count = view.getUint16(eocd + 10, true), central = view.getUint32(eocd + 16, true)
  let p = central; const entries = []
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('Répertoire ZIP invalide')
    const method = view.getUint16(p + 10, true), size = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true), extraLen = view.getUint16(p + 30, true), commentLen = view.getUint16(p + 32, true)
    const local = view.getUint32(p + 42, true), name = new TextDecoder().decode(data.slice(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/') || size > 40 * 1024 * 1024 || !SUPPORTED_IMPORT.test(name) || /\.zip$/i.test(name)) continue
    if (view.getUint32(local, true) !== 0x04034b50) continue
    const localName = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true)
    const start = local + 30 + localName + localExtra, packed = data.slice(start, start + size)
    let unpacked
    if (method === 0) unpacked = packed
    else if (method === 8) unpacked = await inflateRaw(packed)
    else continue
    entries.push(new File([unpacked], name, { type: 'application/octet-stream' }))
  }
  return entries
}
export function importCapabilities() {
  return {
    direct: ['XLSX','XLS','ODS','CSV','TSV','JSON','TXT','Markdown','PDF texte','DOCX'],
    archive: ['ZIP contenant des formats pris en charge'],
    images: ['PNG','JPG/JPEG','WebP — conservées comme source à qualifier; la reconnaissance d’objet passe par MISES Vision'],
    rule: 'Aucun contenu illisible n’est inventé; toute extraction documentaire non structurée passe par À vérifier.'
  }
}
export function normalizeImportRow(row, table, sourceId, index) {
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) continue
    const field = fields[normalize(key)] || key
    result[field] = decodeCell(value)
  }
  result.id = String(result.id || `${sourceId}-${table}-${index + 1}`)
  for (const field of arrayFields) if (typeof result[field] === 'string') result[field] = result[field].split(/[;|]/).map(v => v.trim()).filter(Boolean)
  // Do not add metadata on round-trip rows: preserve their provenance exactly.
  if (!row.id && !row.identifiant) result.sourceId = sourceId
  if (table === 'objects' && result.owned === undefined) result.owned = false
  if (table === 'objects' && !result.name && result.device) result.name = result.device
  if (!result.provenance) result.provenance = 'user-document'
  if (typeof result.hear !== 'string') result.hear = result.hear == null ? '' : String(result.hear)
  if (typeof result.imagine !== 'string') result.imagine = result.imagine == null ? '' : String(result.imagine)
  return result
}
export function importTables(tables, sourceId, { canonical = false } = {}) {
  const data = emptyData()
  for (const [name, rows] of Object.entries(tables)) {
    const table = tableNames[normalize(name)]
    if (!Array.isArray(rows)) throw new Error(`La feuille ${name} doit contenir une liste`)
    rows.forEach((row, i) => {
      if (!table) {
        data.review.push({ id: `${sourceId}-sheet-${normalize(name)}-${i}`, reason: `Feuille non reconnue : ${name}`, proposed: row, status: 'pending', sourceId, provenance: 'review' })
        return
      }
      try {
        data[table].push(canonical ? row : normalizeImportRow(row, table, sourceId, i))
      } catch (error) {
        data.review.push({ id: `${sourceId}-${table}-invalid-${i}`, table, proposed: row, reason: error.message, status: 'pending', sourceId })
      }
    })
  }
  return data
}
export function textToReview(text, sourceId, kind) {
  const data = emptyData()
  const paragraphs = String(text).split(/\n\s*\n|\r?\n/).map(t => t.trim()).filter(Boolean)
  for (const [i, excerpt] of paragraphs.entries()) data.review.push({ id: `${sourceId}-text-${i}`, sourceId, excerpt, reason: `${kind} : texte extrait à qualifier`, status: 'pending', provenance: 'review' })
  if (!paragraphs.length) data.review.push({ id: `${sourceId}-empty`, sourceId, reason: 'Aucun texte extrait. Document scanné ou vide : saisie manuelle nécessaire (OCR non inclus).', status: 'pending', provenance: 'review' })
  return data
}

const V5_META_SHEETS = new Set([
  'API_MISES', 'RECETTES_EXECUTABLES', 'TABLEAU_DE_BORD_RECETTES', 'VERSION', 'PLAN_RECETTES',
  'SYNTHÈSE_V5', 'CONTROLE_RECETTES', 'SYNTHÈSE_QUALITÉ', 'LIRE_D_ABORD', 'BRUITAGES', 'OBJETS',
  'TECHNIQUES', 'RELATIONS', 'JEUX', 'ACTIVITES_PEDAGOGIQUES', 'SCENES', 'ETAPES_SCENES',
  'FABRICATIONS', 'UNIVERS', 'TAGS_JEUX', 'MODELES_JEUX', 'INVENTAIRES_HISTORIQUES', 'MEDIAS',
  'SOURCES', 'PREUVES', 'A_VERIFIER', 'PUBLICATION', 'EXPORT_PUBLIC_WEB', 'AUDIT_V3', 'AUDIT_V4',
  'CONTROLE_QUALITE_V4', 'VOCABULAIRE', 'RECETTES_PRATIQUES_V5', 'AUDIT_V5', 'MODELE_RECETTE',
  'A_REFORMULER_SECURITE', 'CONTRAT_MISES'
])
/** Map CONSULTATION (Data Bruitage V5) → Objets. Only PRIVE_ONLY / MIXTE enter personal stock.
 *  PUBLIC_WEB stays in the embedded public library and is skipped here. */
export function consultationRowsToObjects(rows = [], sourceId = 'consultation') {
  const objects = []
  for (const [index, row] of rows.entries()) {
    const scope = String(row.publication_scope || row.publicationScope || '').trim().toUpperCase()
    if (scope === 'PUBLIC_WEB') continue
    if (scope && scope !== 'PRIVE_ONLY' && scope !== 'MIXTE') continue
    const son = String(row.son || row.sound || '').trim()
    const objets = String(row.objets || row.objects || '').trim()
    const technique = String(row.technique || '').trim()
    const relationId = String(row.relation_id || row.relationId || `${sourceId}-${index + 1}`).trim()
    if (!son && !objets && !technique) continue
    objects.push({
      id: `obj-${relationId}`,
      name: son || objets || relationId,
      hear: son,
      imagine: '',
      device: objets,
      family: 'Data Bruitage privé',
      source: String(row.sources || '').slice(0, 240),
      status: String(row.statut || 'available'),
      notes: technique,
      provenance: 'user-document',
      sounds: son ? [son] : [],
      owned: true,
      publicationScope: scope || 'PRIVE_ONLY',
      tags: ['prive', 'data-bruitage-v5']
    })
  }
  return objects
}

const DATA_MARKERS = ['MISES-Data-Bruitage-v1', 'MISE-Data-Bruitage-v1']
const BINDER_MARKERS = ['MISES-Classeur-v1', 'MISE-Classeur-v1']
const MARKER_SHEETS = ['_MISES', '_MISE']
export function workbookToData(bytes, sourceId, csv = false) {
  const book = XLSX.read(bytes, { type: 'array', cellDates: false, raw: true, ...(csv ? { codepage: 65001 } : {}) })
  const markerSheet = MARKER_SHEETS.find(name => book.Sheets[name])
  const marker = markerSheet ? book.Sheets[markerSheet]?.A1?.v : undefined
  const classeur = BINDER_MARKERS.includes(marker)
  const canonical = DATA_MARKERS.includes(marker) || classeur
  const skip = new Set([...MARKER_SHEETS, ...(classeur ? ['Index', 'Doublons'] : [])])
  const hasConsultation = Boolean(book.Sheets.CONSULTATION) && !csv
  if (hasConsultation) {
    // Data Bruitage V5 workbook: import only personal CONSULTATION rows; ignore meta/public sheets.
    for (const name of book.SheetNames) {
      if (V5_META_SHEETS.has(name) || name === 'CONSULTATION') skip.add(name)
    }
  }
  const tables = {}
  for (const name of book.SheetNames.filter(n => !skip.has(n))) {
    const rows = XLSX.utils.sheet_to_json(book.Sheets[name], { defval: '' })
    // Our workbook uses typed cells and json: values; ordinary tables accept common headers.
    tables[csv ? 'Objets' : name] = canonical ? rows.map(row => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== '').map(([k, v]) => [k, decodeCell(v)]))) : rows
  }
  const data = importTables(tables, sourceId, { canonical })
  if (hasConsultation) {
    const consultation = XLSX.utils.sheet_to_json(book.Sheets.CONSULTATION, { defval: '' })
    const privateObjects = consultationRowsToObjects(consultation, sourceId)
    data.objects.push(...privateObjects.map(row => normalizeImportRow(row, 'objects', sourceId, 0)))
  }
  return { data, canonical }
}
export function exportWorkbook(data) {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['MISES-Data-Bruitage-v1']]), '_MISES')
  for (const [key, title] of Object.entries(TABLES)) {
    const rows = (data[key] || []).map(row => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v !== null && typeof v !== 'object' && v !== '' && !(typeof v === 'string' && v.startsWith('json:')) ? v : `json:${JSON.stringify(v)}`])))
    XLSX.utils.book_append_sheet(book, rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['id']]), title)
  }
  return XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true })
}
export function exportBinder(data) {
  const book = XLSX.read(exportWorkbook(data), { type: 'array' })
  if (book.Sheets._MISES?.A1) book.Sheets._MISES.A1.v = 'MISES-Classeur-v1'
  const index = buildIndex(data)
  const duplicates = findDuplicates(data)
  XLSX.utils.book_append_sheet(book, index.length ? XLSX.utils.json_to_sheet(index) : XLSX.utils.aoa_to_sheet([['id']]), 'Index')
  XLSX.utils.book_append_sheet(book, duplicates.length ? XLSX.utils.json_to_sheet(duplicates) : XLSX.utils.aoa_to_sheet([['id']]), 'Doublons')
  return XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true })
}
export function exportIndexCsv(data) {
  const rows = buildIndex(data)
  const sheet = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['id', 'nom', 'son à entendre', 'son à imaginer', 'objet ou dispositif nécessaire', 'famille', 'source', 'statut', 'notes', 'provenance', 'relations', 'sons']])
  return `\uFEFF${XLSX.utils.sheet_to_csv(sheet)}`
}
function downloadBytes(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function parseImportFile(file) {
  if (!SUPPORTED_IMPORT.test(file.name)) throw new Error('Format non pris en charge')
  if (file.size > 40 * 1024 * 1024) throw new Error('Fichier trop volumineux (40 Mo maximum par import)')
  const bytes = await file.arrayBuffer(), digest = await sourceDigest(bytes), sourceId = `source-${digest}`
  const extension = file.name.split('.').pop().toLowerCase()
  let data, canonical = false
  if (['xlsx', 'xls', 'ods', 'csv', 'tsv'].includes(extension)) ({ data, canonical } = workbookToData(bytes, sourceId, ['csv','tsv'].includes(extension)))
  else if (extension === 'json') {
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    canonical = DATA_MARKERS.includes(payload.schema)
    data = importTables(Array.isArray(payload) ? { objects: payload } : payload.tables || Object.fromEntries(Object.entries(payload).filter(([, value]) => Array.isArray(value))), sourceId, { canonical })
  } else if (extension === 'zip') {
    data = emptyData()
    const entries = await unzipFiles(bytes)
    if (!entries.length) throw new Error('Aucun document pris en charge trouvé dans le ZIP')
    for (const entry of entries) {
      const incoming = await parseImportFile(entry)
      for (const key of Object.keys(TABLES)) data[key].push(...incoming[key])
    }
    data.sources.push({ id: sourceId, name: file.name, format: 'zip', digest, size: file.size, provenance: 'user-document', kind: 'archive-import' })
  } else if (['png','jpg','jpeg','webp'].includes(extension)) {
    data = emptyData()
    data.review.push({ id: `${sourceId}-image`, sourceId, excerpt: file.name, reason: 'Image : aucune extraction de texte inventée. Utiliser MISES Vision pour reconnaître les objets, ou qualifier manuellement.', status: 'pending', provenance: 'review' })
  } else {
    let text
    if (extension === 'docx') {
      const mammoth = await import('mammoth/mammoth.browser.js')
      text = (await (mammoth.default || mammoth).extractRawText({ arrayBuffer: bytes })).value
    } else if (extension === 'pdf') {
      const pdfjs = await import('pdfjs-dist')
      const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      const task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true })
      try {
        const doc = await task.promise
        if (doc.numPages > 300) throw new Error('PDF trop long (300 pages maximum par import)')
        const pages = []
        for (let page = 1; page <= doc.numPages; page++) {
          const content = await (await doc.getPage(page)).getTextContent()
          pages.push(content.items.map(item => (item.str || '') + (item.hasEOL ? '\n' : ' ')).join(''))
        }
        text = pages.join('\n\n')
      } finally { await task.destroy() }
    } else text = new TextDecoder().decode(bytes)
    data = textToReview(text, sourceId, extension.toUpperCase())
  }
  if (!Object.values(data).some(rows => rows.length)) throw new Error('Aucune ligne exploitable dans ce fichier')
  if (!canonical) data.sources.push({ id: sourceId, name: file.name, format: extension, digest, size: file.size, provenance: 'user-document', kind: 'user-document' })
  return data
}
export function downloadWorkbook(data) {
  downloadBytes(exportWorkbook(data), 'MISES-Data-Bruitage.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
export function downloadBinder(data) {
  downloadBytes(exportBinder(data), 'MISES-Classeur.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
export function downloadIndexCsv(data) {
  downloadBytes(new TextEncoder().encode(exportIndexCsv(data)), 'MISES-Index.csv', 'text/csv;charset=utf-8')
}
