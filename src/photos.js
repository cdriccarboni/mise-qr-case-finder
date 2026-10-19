/** Photos multiples par objet : migration, compression, miniatures, file hors-ligne (pure + helpers navigateur). */
import { stableId } from './ids.js'

export const PHOTO_MAX = 1600, THUMB_MAX = 320
export const QUEUE_ID = 'photo-upload-queue'

/** Migre l'ancienne photo unique (dataURL) vers photos[] sans la perdre ; o.photo reste la photo principale. */
export function migrateObjectPhotos(o) {
  if (!o || Array.isArray(o.photos)) return o
  const photos = typeof o.photo === 'string' && o.photo.startsWith('data:image/')
    ? [{ id: `${o.id}-legacy`, dataUrl: o.photo, thumb: o.photo, mime: (o.photo.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg', createdAt: o.updatedAt || o.createdAt || null, status: 'local', legacy: true }]
    : []
  return { ...o, photos }
}
export function addPhoto(o, photo) {
  const base = migrateObjectPhotos(o)
  const entry = { id: photo.id || stableId('photo'), status: 'local', createdAt: new Date().toISOString(), ...photo }
  const photos = [...base.photos, entry]
  return { object: { ...base, photos, photo: base.photo || entry.dataUrl, updatedAt: new Date().toISOString() }, photo: entry }
}
export function removePhoto(o, photoId) {
  const base = migrateObjectPhotos(o)
  const photos = base.photos.filter(p => p.id !== photoId)
  return { ...base, photos, photo: photos[0]?.dataUrl || photos[0]?.thumb || '', updatedAt: new Date().toISOString() }
}
export function photoRemotePath(spaceId, store, recordId, photoId) {
  const safe = v => String(v).replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${spaceId}/${safe(store)}/${safe(recordId)}/${safe(photoId)}.jpg`
}

// File hors-ligne : [{store, recordId, photoId, attempts, lastError}]
export function enqueuePhoto(queue = [], item) {
  if (queue.some(q => q.store === item.store && q.recordId === item.recordId && q.photoId === item.photoId)) return queue
  return [...queue, { attempts: 0, lastError: '', queuedAt: new Date().toISOString(), ...item }]
}
export function markPhotoDone(queue = [], item) { return queue.filter(q => !(q.store === item.store && q.recordId === item.recordId && q.photoId === item.photoId)) }
export function markPhotoFailed(queue = [], item, error) {
  return queue.map(q => q.store === item.store && q.recordId === item.recordId && q.photoId === item.photoId ? { ...q, attempts: q.attempts + 1, lastError: String(error?.message || error) } : q)
}
export function pendingPhotos(queue = [], maxAttempts = 5) { return queue.filter(q => q.attempts < maxAttempts) }

export function fitSize(w, h, max) {
  const r = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * r)), height: Math.max(1, Math.round(h * r)) }
}
/** Navigateur : compresse en JPEG + miniature. */
export async function compressImage(file, { max = PHOTO_MAX, thumb = THUMB_MAX, quality = 0.82 } = {}) {
  const bitmap = await createImageBitmap(file)
  const draw = (limit, q) => {
    const { width, height } = fitSize(bitmap.width, bitmap.height, limit)
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', q)
  }
  return { dataUrl: draw(max, quality), thumb: draw(thumb, 0.7), mime: 'image/jpeg', width: bitmap.width, height: bitmap.height }
}
