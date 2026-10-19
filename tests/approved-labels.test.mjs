import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { renderContainerLabelRgba, containerQrUrl } from '../src/label-render.js'

// Empreintes SHA-256 (RGBA) des 6 étiquettes APPROUVÉES le 19/10/2026, indexées par SHA-256 de l'ID (IDs privés).
// Toute modification du rendu doit être réapprouvée : ce test garantit l'égalité pixel à pixel.
const APPROVED = {
  'e71dce886d4e3337': [384, 1172, 'de1ce7b05b8f624efc1e1fc6a4b210cb48e1335f1fc3e2811c06a602f30a2bad'],
  '554e75cc1df6666d': [384, 1046, '0559a1b9bdfec6c57fa586c92781b8207bb939d4bc725464b6dcceb1cd3b61a3'],
  '765dc074784369e7': [384, 1046, '75070af9fef2271d7177408871d29ea1654fd1b99a077b8e4e73a7cb9edfcf35'],
  '542c88b425566c62': [384, 1046, 'c5413efa0b48a4088c2dd50cbadfd153d0c9f36cef77fb6c8c3eee0e0aeb7d72'],
  'e6def73337a443c4': [384, 1046, 'bc1db1aa6d2ea41ce28fc101bdd00b2ccd5895b6594372c563395e91176f820a'],
  '553b340bc3e1e610': [384, 1004, 'efb751ee249cef1b0f5302ceed006419b7670005132d84686995ad5c773803ca'],
}
// Même appel que l'app (containerLabelImage) : nom d'étiquette, sous-titre = ID, QR ?case=<id>.
// Les noms des contenants du propriétaire sont PRIVÉS : lus hors dépôt (box), test ignoré ailleurs.
const PRIVATE = process.env.MISES_PRIVATE_LABELS || '/workspace/mises-private/approved-labels.json'
const OWNER = existsSync(PRIVATE) ? JSON.parse(readFileSync(PRIVATE, 'utf8')) : []
if (!OWNER.length) test('étiquettes approuvées (noms privés absents : ignoré)', { skip: true }, () => {})
for (const c of OWNER) test(`étiquette approuvée pixel à pixel : ${c.id}`, () => {
  const img = renderContainerLabelRgba({ id: c.id, name: c.name, subtitle: c.id, qrText: containerQrUrl(c.id) })
  const [w, h, sha] = APPROVED[createHash('sha256').update(c.id).digest('hex').slice(0, 16)]
  assert.equal(img.width, w); assert.equal(img.height, h)
  assert.equal(createHash('sha256').update(Buffer.from(img.rgba.buffer, img.rgba.byteOffset, img.rgba.byteLength)).digest('hex'), sha)
})
