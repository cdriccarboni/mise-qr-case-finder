// #45 : vérifie les OCTETS réellement envoyés à la YHK par l'encodeur Java du pilote Android
// (YhkJobEncoder, compilé à la volée), pour une étiquette seule et pour une sélection multiple.
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderContainerLabelRgba, containerQrUrl } from '../src/label-render.js'
import { decodeQrImage } from './decode-qr.mjs'

const SRC = 'android/app/src/main/java/fr/acousmatictheatre/mises/YhkJobEncoder.java'
const JDK = [process.env.JAVA_HOME, '/workspace/toolchain/jdk17'].find(p => p && existsSync(join(p, 'bin/javac')))
const W = 384, BPR = 48, MARGIN = 80, BAND = 64
let cls
function encoder() {
  if (cls) return cls
  cls = mkdtempSync(join(tmpdir(), 'yhk-'))
  execFileSync(join(JDK, 'bin/javac'), ['-d', cls, SRC])
  return cls
}
function send(images) {
  const parts = [Buffer.alloc(4)]; parts[0].writeInt32BE(images.length)
  for (const img of images) {
    const b = Buffer.alloc(8 + img.width * img.height * 4); b.writeInt32BE(img.width, 0); b.writeInt32BE(img.height, 4)
    for (let i = 0; i < img.width * img.height; i++) b.writeInt32BE(((img.rgba[i*4] << 16) | (img.rgba[i*4+1] << 8) | img.rgba[i*4+2]) | 0, 8 + i * 4)
    parts.push(b)
  }
  return execFileSync(join(JDK, 'bin/java'), ['-cp', encoder(), 'fr.acousmatictheatre.mises.YhkJobEncoder'], { input: Buffer.concat(parts), maxBuffer: 1 << 28 })
}
/** Parse le flux : une liste de jobs (ESC @ … ) dont chaque GS v 0 est une bande ≤ BAND lignes. */
function parse(buf) {
  const jobs = []; let i = 0, cur
  while (i < buf.length) {
    if (buf[i] === 0x1b && buf[i+1] === 0x40) { cur = { rows: [], bands: [] }; jobs.push(cur); i += 2 }
    else if (buf[i] === 0x1d && buf[i+1] === 0x49) i += 4
    else if (buf[i] === 0x1d && buf[i+1] === 0x76) {
      const bpr = buf[i+4] | (buf[i+5] << 8), h = buf[i+6] | (buf[i+7] << 8); assert.equal(bpr, BPR); cur.bands.push(h); i += 8
      for (let r = 0; r < h; r++) { cur.rows.push(buf.subarray(i, i + BPR)); i += BPR }
    } else if (buf[i] === 0x0a) i++
    else assert.fail(`octet inattendu 0x${buf[i].toString(16)} @${i}`)
  }
  return jobs
}
/** Rebobine un job vers l'orientation de l'étiquette (annule la rotation 180°, retire les marges). */
function toLabel(job, height) {
  const rgba = new Uint8ClampedArray(W * height * 4).fill(255)
  for (let y = 0; y < height; y++) { const row = job.rows[MARGIN + y]
    for (let x = 0; x < W; x++) if (row[x >> 3] & (0x80 >> (x & 7))) { const o = ((height - 1 - y) * W + (W - 1 - x)) * 4; rgba[o] = rgba[o+1] = rgba[o+2] = 0 } }
  return { rgba, width: W, height }
}
function checkJob(job, img, id) {
  assert.equal(job.rows.length, img.height + 2 * MARGIN, 'étiquette entière + marges de coupe, jamais tronquée')
  assert.ok(job.bands.every(h => h <= BAND), 'bandes courtes (pas de débordement du tampon)')
  for (let r = 0; r < MARGIN; r++) for (const rr of [r, job.rows.length - 1 - r]) {
    const ink = job.rows[rr].some(b => b), cut = rr === MARGIN / 2 || rr === job.rows.length - 1 - MARGIN / 2
    assert.equal(ink, cut, `marge de coupe ligne ${rr}`)
  }
  const back = toLabel(job, img.height)
  for (let i = 0; i < W * img.height; i++) assert.equal(back.rgba[i*4] === 0, img.rgba[i*4] < 150, `pixel ${i % W},${Math.floor(i / W)} ≠ rendu approuvé`)
  // Le QR (carré du haut) est bien dans les octets et se décode vers la fiche.
  const top = { rgba: back.rgba.slice(0, W * W * 4), width: W, height: W }
  let text = null; for (const s of [top, rot(top)]) { try { text = decodeQrImage(s); break } catch {} }
  assert.equal(text, containerQrUrl(id))
}
function rot(img) { const S = img.width, c = new Uint8ClampedArray(S*S*4)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) c.set(img.rgba.subarray((y*S+x)*4, (y*S+x)*4+4), (x*S + (S-1-y))*4); return { rgba: c, width: S, height: S } }

const LABELS = [['CASE-DEMO-01', 'SAC FICTIF DÉMO'], ['CASE-DEMO-02', 'PETITE BOÎTE · TEST'], ['CASE-DEMO-03', 'VALISE FICTIVE'],
  ['CASE-DEMO-04', 'CARTON — 1/2'], ['CASE-DEMO-05', 'CARTON — 2/2'], ['CASE-DEMO-06', 'MALLE · ESSAI · LONGUE ÉTIQUETTE']]
const render = ([id, name]) => renderContainerLabelRgba({ id, name, subtitle: id, qrText: containerQrUrl(id) })

test('pilote Android : étiquette seule = bitmap approuvé exact + QR dans les octets', { skip: !JDK && 'JDK absent' }, () => {
  const img = render(LABELS[0]); const jobs = parse(send([img]))
  assert.equal(jobs.length, 1); checkJob(jobs[0], img, LABELS[0][0])
})
test('pilote Android : sélection multiple = un job complet par étiquette, chacun avec son QR', { skip: !JDK && 'JDK absent' }, () => {
  const imgs = LABELS.map(render); const jobs = parse(send(imgs))
  assert.equal(jobs.length, LABELS.length)
  jobs.forEach((job, k) => checkJob(job, imgs[k], LABELS[k][0]))
})
test('chemins impression seule / sélection / réimpression : même rendu approuvé, une image par étiquette', () => {
  const main = readFileSync('src/main.js', 'utf8')
  assert.match(main, /const images=list\.map\(c=>\(\{box:c,image:containerLabelImage\(c\)\}\)\)/)
  assert.match(main, /data-print-one[^\n]*printContainerLabels\(\[caseBy/)
  assert.match(main, /#printSelected'\)\.onclick=\(\)=>printContainerLabels\(/)
  const java = readFileSync('android/app/src/main/java/fr/acousmatictheatre/mises/NativePrinterBridge.java', 'utf8')
  assert.match(java, /YhkJobEncoder\.chunks/); assert.match(java, /Thread\.sleep\(wait\)/)
})
test('compagnon Mac : même encodage en bandes + marges de coupe + attente fin d’impression', () => {
  const swift = readFileSync('mac/mini-printer/MisesMiniPrinter.swift', 'utf8')
  assert.match(swift, /static let bandRows=64/); assert.match(swift, /static let cutMarginDots=80/)
  assert.match(swift, /bytes \+= \[0x1d,0x76,0x30,0x00,UInt8\(bpr\),0x00,UInt8\(n&255\)/)
  assert.match(swift, /packets\.append\(Array\(rest\.prefix\(MisesRaster\.bandBytes\)\)\)/)
  assert.match(swift, /Thread\.sleep\(forTimeInterval:MisesRaster\.printSeconds\(data\)\)/)
  assert.doesNotMatch(swift, /interpolationQuality = \.high/)
})
