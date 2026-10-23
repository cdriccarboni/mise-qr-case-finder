import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeOwnerSeedObject } from '../src/owner-private.js'
import { objectLabelQrTarget, shortExternalUrl } from '../src/object-link.js'
import { renderLabelRgba } from '../src/label-render.js'
import { decodeQrImage } from './decode-qr.mjs'

const origin = 'https://mises.test/app/'
const external = 'http://raspberrypi.local:8080/'
const object = { id: 'obj-external-link', name: 'Raspberry Pi', url: external }

test('seed propriétaire : url valide préservée à la normalisation', () => {
  const seed = normalizeOwnerSeedObject({ ...object, url: `  ${external}  ` })
  assert.equal(seed.url, external)
  assert.equal(seed.name, object.name)
  assert.equal(normalizeOwnerSeedObject({ ...object, url: 'ftp://raspberrypi.local/' }).url, '')
})

test('étiquette objet : le QR du lien encode exactement l’URL externe et imprime son texte court', () => {
  const target = objectLabelQrTarget(object, origin, 'link')
  assert.deepEqual(target.choices, ['link', 'record'])
  assert.equal(target.qrText, external)
  assert.equal(target.linkText, 'raspberrypi.local:8080')
  assert.equal(shortExternalUrl(external), target.linkText)
  const image = renderLabelRgba({ name: object.name, id: object.id, qrText: target.qrText, linkText: target.linkText })
  assert.equal(decodeQrImage(image), external)
  assert.equal(image.linkText, 'raspberrypi.local:8080')
})

test('étiquette objet : le QR de la fiche conserve l’URL interne', () => {
  const target = objectLabelQrTarget(object, origin, 'record')
  assert.equal(target.qrText, `${origin}?object=${object.id}`)
  assert.equal(target.linkText, '')
  const image = renderLabelRgba({ name: object.name, id: object.id, qrText: target.qrText })
  assert.equal(decodeQrImage(image), target.qrText)
})

test('sans url, aucun choix QR externe n’est proposé', () => {
  const target = objectLabelQrTarget({ id: object.id, name: object.name }, origin)
  assert.deepEqual(target.choices, [])
  assert.equal(target.choice, 'record')
})
