// Catégorie générique et top 3 des fiches, sur des photos locales, avant/après le classement.
// Usage : node scripts/eval-category.mjs /tmp/mise-photos http://127.0.0.1:4174
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { emptyData } from '../src/data-bruitage.js'
import { closestFiches, matchDetections } from '../src/vision-matching.js'

const dir = process.argv[2]
const origin = process.argv[3] || 'http://127.0.0.1:4174'
if (!dir) throw new Error('Dossier de photos manquant')
const data = emptyData()
data.objects.push(
  { id: 'obj-bidon', name: 'Bidon souple', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-flacon', name: 'Flacon de scène', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-gourde', name: 'Gourde de tournée', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-frappee', name: 'Bouteille frappée', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-tasse', name: 'Tasse ébréchée', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-ciseaux', name: 'Ciseaux de couture', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-livre', name: 'Livre de régie', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-bol', name: 'Bol en grès', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-chaise', name: 'Chaise pliante', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-velo', name: 'Vélo de décor', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-table', name: 'Table de jardin', aliases: [], tags: [], sounds: [], contexts: [] }
)
const order = new Map(data.objects.map((object, index) => [object.id, index]))
const expected = {
  'bottle.jpg': { class: 'bottle', category: "bouteille d'eau", fiche: 'obj-frappee' },
  'cup.jpg': { class: 'cup', category: 'tasse', fiche: 'obj-tasse' },
  'bowl.jpg': { class: 'bowl', category: 'bol', fiche: 'obj-bol' },
  'chairs.jpg': { class: 'chair', category: 'chaise', fiche: 'obj-chaise' },
  'books.jpg': { class: 'book', category: 'livre', fiche: 'obj-livre' },
  'bike.jpg': { class: 'bicycle', category: 'vélo', fiche: 'obj-velo' },
  'scissors.jpg': { class: 'scissors', category: 'ciseaux', fiche: 'obj-ciseaux' },
  'small-scissors.jpg': { class: 'scissors', category: 'ciseaux', fiche: 'obj-ciseaux' }
}

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(origin)
await page.waitForFunction(() => document.querySelector('#appVersion'))
let categoryBefore = 0
let categoryAfter = 0
let topBefore = 0
let topAfter = 0
const rows = []
for (const [name, truth] of Object.entries(expected)) {
  const bytes = await readFile(`${dir}/${name}`)
  const dataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`
  const detected = await page.evaluate(async src => {
    const vision = await import('/src/local-vision.js')
    const image = new Image()
    image.src = src
    await image.decode()
    const detector = await vision.loadLocalDetector()
    const after = await vision.detectMultipass(detector, image)
    return after.filter(item => item.class !== 'person').map(item => ({ class: item.class, score: item.score }))
  }, dataUrl)
  const matches = matchDetections(detected, data, '')
  const hit = matches.find(item => item.rawLabel === truth.class)
  const previous = hit ? [...hit.candidates].sort((a, b) => b.lexical - a.lexical || order.get(a.objectId) - order.get(b.objectId)).slice(0, 3) : []
  const shownBefore = previous.find(item => item.lexical >= 0.7)?.name || ''
  const catBefore = shownBefore === truth.category
  const catAfter = hit?.category === truth.category
  const topB = previous.some(item => item.objectId === truth.fiche)
  const topA = hit ? closestFiches(hit.candidates).some(item => item.objectId === truth.fiche) : false
  if (catBefore) categoryBefore += 1
  if (catAfter) categoryAfter += 1
  if (topB) topBefore += 1
  if (topA) topAfter += 1
  rows.push({ name, classes: detected.map(item => item.class), category: hit?.category || '', top: hit ? closestFiches(hit.candidates).map(item => item.name) : [], catBefore, catAfter, topB, topA })
  console.log(JSON.stringify(rows.at(-1)))
}
await browser.close()
const total = Object.keys(expected).length
console.log(JSON.stringify({ photos: total, categoryBefore: `${categoryBefore}/${total}`, categoryAfter: `${categoryAfter}/${total}`, top3Before: `${topBefore}/${total}`, top3After: `${topAfter}/${total}` }))
