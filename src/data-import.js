import * as XLSX from 'xlsx'
import * as codepages from 'xlsx/dist/cpexcel.full.mjs'
import { TABLES, emptyData, normalize, buildIndex, findDuplicates } from './data-bruitage.js'

XLSX.set_cptable(codepages)

const tableNames = Object.fromEntries(Object.entries(TABLES).flatMap(([key, name]) => [[normalize(key), key], [normalize(name), key]]))
Object.assign(tableNames, { containers: 'cases', object_sound_links: 'objectSounds', 'object sound links': 'objectSounds', 'elements a verifier': 'review' })
const fields = { nom: 'name', objet: 'name', son: 'name', identifiant: 'id', sons: 'sounds', contexte: 'contexts', contextes: 'contexts', contenant: 'caseId', object_id: 'objectId', sound_id: 'soundId', 'object id': 'objectId', 'sound id': 'soundId', 'son a entendre': 'hear', 'son a imaginer': 'imagine', 'objet ou dispositif necessaire': 'device', famille: 'family', statut: 'status', notes: 'notes', provenance: 'provenance', source: 'source' }
const arrayFields = ['sounds', 'tags', 'contexts', 'aliases', 'objectIds', 'checked']
export const SUPPORTED_IMPORT = /\.(xlsx|xls|csv|json|txt|pdf|docx)$/i
export async function sourceDigest(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('')
}
function decodeCell(value) {
  if (typeof value === 'string' && value.startsWith('json:')) return JSON.parse(value.slice(5))
  return value
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
  const tables = {}
  for (const name of book.SheetNames.filter(n => !skip.has(n))) {
    const rows = XLSX.utils.sheet_to_json(book.Sheets[name], { defval: '' })
    // Our workbook uses typed cells and json: values; ordinary tables accept common headers.
    tables[csv ? 'Objets' : name] = canonical ? rows.map(row => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== '').map(([k, v]) => [k, decodeCell(v)]))) : rows
  }
  return { data: importTables(tables, sourceId, { canonical }), canonical }
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
  if (['xlsx', 'xls', 'csv'].includes(extension)) ({ data, canonical } = workbookToData(bytes, sourceId, extension === 'csv'))
  else if (extension === 'json') {
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    canonical = DATA_MARKERS.includes(payload.schema)
    data = importTables(Array.isArray(payload) ? { objects: payload } : payload.tables || Object.fromEntries(Object.entries(payload).filter(([, value]) => Array.isArray(value))), sourceId, { canonical })
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
