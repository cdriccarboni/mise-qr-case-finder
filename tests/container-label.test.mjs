import test from 'node:test'
import assert from 'node:assert/strict'
import { renderContainerLabelRgba, containerQrUrl, PRINTHEAD_DOTS, MAX_LABEL_DOTS } from '../src/label-render.js'
import { decodeQrImage } from './decode-qr.mjs'
const NAMES = ['CARTON FICTIF / 1 SUR 2', 'Sac fictif démo', 'Grande valise fictive de démonstration très longue pour tester le retour à la ligne', 'A']
function decodeAnyOrientation(img) {
  const S = img.width, base = img.rgba.subarray(0, S * S * 4)
  for (let r = 0; r < 4; r++) {
    const c = new Uint8ClampedArray(S * S * 4)
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const [ox, oy] = [[x, y], [S - 1 - y, x], [S - 1 - x, S - 1 - y], [y, S - 1 - x]][r]
      c.set(base.subarray((y * S + x) * 4, (y * S + x) * 4 + 4), (oy * S + ox) * 4)
    }
    try { return decodeQrImage({ rgba: c, width: S, height: S }) } catch {}
  }
  return null
}
const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 !.'*/-]/g, ' ').replace(/\s+/g, ' ').trim()
for (const name of NAMES) test(`étiquette contenant : ${name}`, () => {
  const id = `CASE-FICTIF-${name.length}`
  const img = renderContainerLabelRgba({ id, name, subtitle: id })
  assert.equal(img.width, PRINTHEAD_DOTS)
  assert.ok(img.height <= MAX_LABEL_DOTS && img.height > PRINTHEAD_DOTS * 0.9)
  assert.equal(img.layout.lines.join(' '), fold(name).replace(/ \/ /, ' '), 'nom jamais tronqué')
  assert.ok(img.layout.lines.length <= 2)
  assert.ok(img.layout.textLeft + img.layout.textWidth <= img.layout.length - 8, 'texte dans la longueur')
  assert.ok(img.qrMm >= 15, `QR ${img.qrMm} mm`)
  // zone QR (ce que vise le téléphone) : carré du haut de l'étiquette tournée
  assert.equal(decodeAnyOrientation(img), containerQrUrl(id))
  // marges thermiques : aucune encre sur les 8 premiers/derniers points de la tête
  for (let y = 0; y < img.height; y++) for (const x of [0, 4, 7, 376, 383]) assert.ok(img.rgba[(y * img.width + x) * 4] > 128, `encre en marge x=${x} y=${y}`)
})
test('modifier le texte ne change pas la cible du QR', () => {
  const a = renderContainerLabelRgba({ id: 'CASE-X', name: 'Nom 1' }), b = renderContainerLabelRgba({ id: 'CASE-X', name: 'Autre nom bien plus long' })
  assert.equal(a.qrText, b.qrText); assert.equal(a.qrText, 'https://cdriccarboni.github.io/mise-qr-case-finder/?case=CASE-X')
})
test('régression décodeur : QR d’un ID de 17 caractères (7 pts/module) décodé, matrice exacte', () => {
  const img = renderContainerLabelRgba({ id: 'KIT-FICTIF-DEMO-X', name: 'KIT FICTIF DÉMO', subtitle: 'KIT-FICTIF-DEMO-X' })
  assert.equal(img.qrModuleDots, 7)
  assert.equal(decodeAnyOrientation(img), containerQrUrl('KIT-FICTIF-DEMO-X'))
})
