import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { BUILTIN_CONTAINERS } from '../src/builtin-containers.js'
import { renderContainerLabelRgba, containerQrUrl } from '../src/label-render.js'

// Empreintes SHA-256 (RGBA) des 6 étiquettes APPROUVÉES par Cédric le 19/10/2026 (SAC-MICRO-02 renommé « PETIT SAC TECHNIQUE · MICRO » le 19/10) (QR en haut, « mises! », nom sur 2 lignes, ID).
// Toute modification du rendu doit être réapprouvée : ce test garantit l'égalité pixel à pixel.
const APPROVED = {
  'SAC-NOIR-TECH-01': [384, 1172, 'de1ce7b05b8f624efc1e1fc6a4b210cb48e1335f1fc3e2811c06a602f30a2bad'],
  'SAC-MICRO-02': [384, 1046, '0559a1b9bdfec6c57fa586c92781b8207bb939d4bc725464b6dcceb1cd3b61a3'],
  'SAC-VIE-QUOT-01': [384, 1046, '75070af9fef2271d7177408871d29ea1654fd1b99a077b8e4e73a7cb9edfcf35'],
  'SAC-VIE-QUOT-02': [384, 1046, 'c5413efa0b48a4088c2dd50cbadfd153d0c9f36cef77fb6c8c3eee0e0aeb7d72'],
  'SAC-ANIM-MUS-PERC-01': [384, 1046, 'bc1db1aa6d2ea41ce28fc101bdd00b2ccd5895b6594372c563395e91176f820a'],
  'KIT-ACOUSTIQUE-CC': [384, 1004, 'efb751ee249cef1b0f5302ceed006419b7670005132d84686995ad5c773803ca'],
}
// Même appel que l'app (containerLabelImage) : nom d'étiquette, sous-titre = ID, QR ?case=<id>.
for (const c of BUILTIN_CONTAINERS) test(`étiquette approuvée pixel à pixel : ${c.id}`, () => {
  const img = renderContainerLabelRgba({ id: c.id, name: c.name, subtitle: c.id, qrText: containerQrUrl(c.id) })
  const [w, h, sha] = APPROVED[c.id]
  assert.equal(img.width, w); assert.equal(img.height, h)
  assert.equal(createHash('sha256').update(Buffer.from(img.rgba.buffer, img.rgba.byteOffset, img.rgba.byteLength)).digest('hex'), sha)
})
