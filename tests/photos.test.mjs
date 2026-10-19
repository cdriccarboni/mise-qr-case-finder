import test from 'node:test'
import assert from 'node:assert/strict'
import { migrateObjectPhotos, addPhoto, removePhoto, enqueuePhoto, markPhotoDone, markPhotoFailed, pendingPhotos, fitSize, photoRemotePath } from '../src/photos.js'
const img = 'data:image/png;base64,AAAA'
test('migration photo unique -> photos[] sans perte, idempotente', () => {
  const m = migrateObjectPhotos({ id: 'o1', photo: img })
  assert.equal(m.photos.length, 1); assert.equal(m.photos[0].dataUrl, img); assert.equal(m.photo, img)
  assert.equal(migrateObjectPhotos(m), m)
  assert.deepEqual(migrateObjectPhotos({ id: 'o2' }).photos, [])
})
test('ajout / suppression de photos', () => {
  const { object, photo } = addPhoto({ id: 'o1', photo: img }, { dataUrl: 'data:image/jpeg;base64,BB', thumb: 't' })
  assert.equal(object.photos.length, 2); assert.equal(object.photo, img)
  const r = removePhoto(object, 'o1-legacy'); assert.equal(r.photos.length, 1); assert.equal(r.photo, 'data:image/jpeg;base64,BB')
  assert.match(photo.id, /^photo-/)
})
test('file hors-ligne : dédoublonnage, échec, succès', () => {
  const it = { store: 'objects', recordId: 'o1', photoId: 'p1' }
  let q = enqueuePhoto(enqueuePhoto([], it), it); assert.equal(q.length, 1)
  for (let i = 0; i < 5; i++) q = markPhotoFailed(q, it, new Error('offline'))
  assert.equal(pendingPhotos(q).length, 0); assert.equal(q[0].lastError, 'offline')
  assert.equal(markPhotoDone(q, it).length, 0)
})
test('dimensions et chemin distant', () => {
  assert.deepEqual(fitSize(4000, 2000, 1600), { width: 1600, height: 800 })
  assert.deepEqual(fitSize(100, 50, 1600), { width: 100, height: 50 })
  assert.equal(photoRemotePath('sp', 'objects', 'o/1', 'p1'), 'sp/objects/o_1/p1.jpg')
})
