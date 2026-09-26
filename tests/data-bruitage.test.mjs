import test from 'node:test'
import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { emptyData, DATA_STORES, planImport, mergeData, readData, saveReviewedRow, enrichObjects } from '../src/data-bruitage.js'
import { exportWorkbook, workbookToData, parseImportFile, textToReview } from '../src/data-import.js'
import { matchDetections, analyseMise, correctionKey } from '../src/vision-matching.js'
import * as XLSX from 'xlsx'

const fixture = () => ({ ...emptyData(),
  cases: [{ id: 'case-synthetic', name: 'Contenant synthétique' }],
  objects: [{ id: 'obj-synthetic', name: 'Bouteille synthétique', caseId: 'case-synthetic', sounds: [], tags: [], contexts: ['pluie'], owned: false }],
  sounds: [{ id: 'sound-synthetic', name: 'Pluie synthétique' }],
  objectSounds: [{ id: 'link-synthetic', objectId: 'obj-synthetic', soundId: 'sound-synthetic' }],
  aliases: [{ id: 'alias-synthetic', label: 'bottle', targetType: 'objects', targetId: 'obj-synthetic' }],
  mises: [{ id: 'mise-synthetic', name: 'Mise synthétique', objectIds: ['obj-synthetic'], checked: [] }],
  sources: [{ id: 'source-synthetic', name: 'Source synthétique' }],
  review: [{ id: 'review-synthetic', reason: 'À vérifier', proposed: { name: 'Objet synthétique' }, status: 'pending' }]
})
async function database() {
  return openDB(`test-${crypto.randomUUID()}`, 4, { upgrade(db) { for (const key of DATA_STORES) db.createObjectStore(key, { keyPath: 'id' }) } })
}
test('all tables and typed fields survive XLSX round trip, including empty strings and json prefixes', () => {
  const data = fixture(); data.objects[0].note = ''; data.objects[0].literal = 'json:literal'; data.objects[0].optional = null
  data.objects[0].name = '=SUM(1,2)'; data.objects[0].media = { synthetic: true }
  data.corrections.push({ id: correctionKey('bottle', 'pluie'), label: 'bottle', context: 'pluie', action: 'match', objectId: 'obj-synthetic' })
  const bytes = exportWorkbook(data), result = workbookToData(bytes, 'source-test')
  assert.equal(result.canonical, true)
  assert.deepEqual(result.data, data)
  const book = XLSX.read(bytes, { type: 'array' }); assert.equal(book.Sheets.Objets.B2.f, undefined)
  const plan = planImport(data, result.data); assert.equal(plan.counts.added, 0); assert.equal(plan.counts.review, 0)
})
test('repeated imports are idempotent and conflicting imports never replace human edits', async () => {
  const db = await database(), data = fixture()
  await mergeData(db, data); assert.equal((await mergeData(db, data)).added, 0)
  await saveReviewedRow(db, 'objects', { ...data.objects[0], name: 'Correction synthétique' })
  const result = await mergeData(db, data)
  assert.equal(result.review, 1); assert.equal((await db.get('objects', 'obj-synthetic')).name, 'Correction synthétique')
  assert.equal((await mergeData(db, data)).review, 0); db.close()
})
test('orphaned relations and invalid rows go to review without invalidating valid rows', () => {
  const data = fixture(); data.objectSounds.push({ id: 'orphan-synthetic', objectId: 'missing', soundId: 'sound-synthetic' }); data.objects.push({ id: 'invalid-synthetic' })
  const plan = planImport(emptyData(), data)
  assert.equal(plan.counts.review, 2); assert.equal(plan.additions.objectSounds.length, 1)
})
test('human review validates references and atomically resolves the issue', async () => {
  const db = await database(); await mergeData(db, fixture())
  await assert.rejects(saveReviewedRow(db, 'objectSounds', { id: 'bad', objectId: 'missing', soundId: 'sound-synthetic' }, 'review-synthetic'))
  assert.equal((await db.get('review', 'review-synthetic')).status, 'pending')
  await saveReviewedRow(db, 'objects', { id: 'obj-new-synthetic', name: 'Objet ajouté' }, 'review-synthetic')
  assert.equal((await db.get('review', 'review-synthetic')).status, 'resolved'); db.close()
})
test('CSV quoted delimiters and newlines are parsed locally', async () => {
  const file = new File(['nom;sons\n"Objet; synthétique";"pluie|vent"\n"Objet\nsynthétique";eau'], 'synthetic.csv')
  const data = await parseImportFile(file)
  assert.equal(data.objects.length, 2); assert.equal(data.objects[0].name, 'Objet; synthétique'); assert.deepEqual(data.objects[0].sounds, ['pluie', 'vent'])
  assert.equal((await parseImportFile(file)).objects[0].id, data.objects[0].id)
})
test('XLS legacy and normal XLSX import support recognized and unknown sheets', async () => {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([{ nom: 'Objet synthétique' }]), 'Objets')
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([{ texte: 'Note synthétique' }]), 'Autres')
  for (const ext of ['xls', 'xlsx']) {
    const data = await parseImportFile(new File([XLSX.write(book, { type: 'array', bookType: ext === 'xls' ? 'biff8' : 'xlsx' })], `synthetic.${ext}`))
    assert.equal(data.objects.length, 1); assert.equal(data.review.length, 1)
  }
})
test('JSON rejects malformed data, TXT stays unvalidated, empty extraction explains OCR limitation', async () => {
  await assert.rejects(parseImportFile(new File(['{'], 'synthetic.json')))
  const data = await parseImportFile(new File(['Texte synthétique\nAutre ligne'], 'synthetic.txt'))
  assert.equal(data.objects.length, 0); assert.equal(data.review.length, 2)
  assert.match(textToReview('', 'synthetic', 'PDF').review[0].reason, /OCR/)
})
test('global catalogue enriches objects using relations and aliases beyond any kit', () => {
  const data = fixture(), enriched = enrichObjects(data)
  assert.deepEqual(enriched[0].sounds, ['Pluie synthétique']); assert.ok(enriched[0].aliases.includes('bottle'))
  const matched = matchDetections([{ class: 'bottle', score: .88, bbox: [0, 0, 10, 10] }], data, 'pluie')
  assert.equal(matched[0].objectId, 'obj-synthetic'); assert.equal(matched[0].validated, false)
})
test('context cannot invent a visually unsupported object; people are excluded', () => {
  const data = fixture(), result = matchDetections([{ class: 'person', score: .9 }, { class: 'chair', score: .9 }], data, 'pluie')
  assert.equal(result.length, 1); assert.equal(result[0].objectId, '')
})
test('ambiguous matches remain proposals and multi-object instances are preserved', () => {
  const data = fixture(); data.objects.push({ id: 'obj-other', name: 'Bouteille', aliases: ['bottle'] })
  const result = matchDetections([{ class: 'bottle', score: .9 }, { class: 'bottle', score: .8 }], data)
  assert.equal(result.length, 2); assert.equal(result[0].ambiguous, true); assert.equal(result[0].validated, false)
})
test('learned match/rejection takes priority only in its context and is never auto-confirmed', () => {
  const data = fixture(); data.corrections.push({ id: correctionKey('chair', 'atelier'), label: 'chair', context: 'atelier', action: 'match', objectId: 'obj-synthetic' })
  const input = [{ class: 'chair', score: .99 }]
  const result = matchDetections(input, data, 'atelier')[0]
  assert.equal(result.objectId, 'obj-synthetic'); assert.equal(result.learned, true); assert.equal(result.validated, false)
  assert.equal(matchDetections(input, data, 'autre')[0].objectId, '')
  data.corrections[0].action = 'reject'; assert.equal(matchDetections(input, data, 'atelier')[0].rejected, true)
  data.corrections[0].action = 'match'; data.corrections[0].objectId = 'deleted'; assert.equal(matchDetections(input, data, 'atelier')[0].objectId, '')
})
test('mise analysis separates present, missing, extra, unknown and review without auto-checking', () => {
  const mise = { objectIds: ['a', 'b'], checked: ['a'] }
  const proposals = [{ objectId: 'b', validated: false }, { objectId: 'c', validated: true }, { objectId: '', validated: false }]
  const result = analyseMise(mise, proposals)
  assert.deepEqual(result.present, ['a']); assert.deepEqual(result.missing, ['b']); assert.equal(result.extra.length, 1); assert.equal(result.unknown.length, 1); assert.equal(result.review.length, 2)
  assert.deepEqual(analyseMise(mise, [{ objectId: 'b', validated: true }], []).present, ['b'])
})
