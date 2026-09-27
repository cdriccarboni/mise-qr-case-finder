// Compare the old single COCO pass with the multipass fusion, on local photos.
// Usage: node scripts/eval-vision.mjs /tmp/mise-photos http://127.0.0.1:4174
import { readFile, readdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { emptyData } from '../src/data-bruitage.js'
import { matchDetections } from '../src/vision-matching.js'

const dir = process.argv[2]
const origin = process.argv[3] || 'http://127.0.0.1:4174'
const files = (await readdir(dir)).filter(name => /\.(jpe?g|png|webp)$/i.test(name)).sort()
const catalogue = emptyData()
catalogue.objects.push(
  { id: 'obj-gourde', name: 'Gourde de tournée', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-tasse', name: 'Tasse ébréchée', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-ciseaux', name: 'Ciseaux de couture', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-livre', name: 'Livre de régie', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-bol', name: 'Bol en grès', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-chaise', name: 'Chaise pliante', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-velo', name: 'Vélo de décor', aliases: [], tags: [], sounds: [], contexts: [] },
  { id: 'obj-table', name: 'Table de jardin', aliases: [], tags: [], sounds: [], contexts: [] }
)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(origin)
await page.waitForFunction(() => document.querySelector('#appVersion'))
const rows = []
for (const name of files) {
  const bytes = await readFile(`${dir}/${name}`)
  const dataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`
  const detected = await page.evaluate(async src => {
    const vision = await import('./src/local-vision.js')
    const image = new Image()
    image.src = src
    await image.decode()
    const detector = await vision.loadLocalDetector()
    const before = await detector.detect(image, 40, 0.35)
    const after = await vision.detectMultipass(detector, image)
    const labels = list => list.filter(item => item.class !== 'person').map(item => ({ class: item.class, score: Math.round((item.score || 0) * 100) / 100, pass: item.pass || 'unique', support: item.support || 1 }))
    return { before: labels(before), after: labels(after) }
  }, dataUrl)
  const beforeMatch = matchDetections(detected.before.map(item => ({ class: item.class, score: item.score })), catalogue, '')
  const afterMatch = matchDetections(detected.after.map(item => ({ class: item.class, score: item.score })), catalogue, '')
  rows.push({
    name,
    before: detected.before,
    after: detected.after,
    beforeFiches: beforeMatch.filter(item => item.objectId).map(item => item.label),
    afterFiches: afterMatch.filter(item => item.objectId).map(item => item.label)
  })
  console.log(JSON.stringify(rows.at(-1)))
}
await browser.close()
console.log(JSON.stringify({ photos: rows.length }))
