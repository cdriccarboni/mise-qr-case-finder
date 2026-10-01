import { fuseDetections, mapDetection, planPasses } from './vision-pass.js'

let pending
export async function loadLocalDetector() {
  if (!pending) pending = (async () => {
    const tf = await import('@tensorflow/tfjs')
    try { await tf.setBackend('webgl'); await tf.ready() } catch { await tf.setBackend('cpu'); await tf.ready() }
    const coco = await import('@tensorflow-models/coco-ssd')
    return coco.load({ base: 'lite_mobilenet_v2', modelUrl: new URL(`${import.meta.env.BASE_URL}models/coco-ssd/model.json`, document.baseURI).href })
  })().catch(error => { pending = null; throw error })
  return pending
}

function renderPass(image, pass) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (pass.rotation === 90) {
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    canvas.width = Math.max(1, height)
    canvas.height = Math.max(1, width)
    ctx.translate(canvas.width, 0)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(image, 0, 0)
    return canvas
  }
  canvas.width = Math.max(1, Math.round(pass.w * (pass.scale || 1)))
  canvas.height = Math.max(1, Math.round(pass.h * (pass.scale || 1)))
  ctx.drawImage(image, pass.x, pass.y, pass.w, pass.h, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function detectMultipass(detector, image) {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height || !detector) return []
  const found = []
  const passes = planPasses(width, height)
  const fast = passes.filter(pass => pass.tier !== 'dense')
  const dense = passes.filter(pass => pass.tier === 'dense')
  const run = async pass => {
    try {
      const source = pass.name === 'entier' ? image : renderPass(image, pass)
      const boxes = await detector.detect(source, pass.max, pass.minScore)
      for (const box of boxes || []) {
        if ((box.score || 0) < pass.minScore) continue
        found.push(mapDetection(box, pass, width, height))
      }
    } catch { /* une passe ratée ne bloque pas les autres */ }
  }
  for (const pass of fast) await run(pass)
  let fused = fuseDetections(found)
  if (fused.length < 18) {
    const densePasses = fused.length <= 3
      ? dense.filter(pass => ['tuile-00', 'tuile-11', 'tuile-22', 'rotation'].includes(pass.name))
      : dense
    for (const pass of densePasses) await run(pass)
    fused = fuseDetections(found)
  }
  return fused
}

export async function detectLocal(image) {
  if (Array.isArray(globalThis.__MISES_DETECTIONS)) return globalThis.__MISES_DETECTIONS.map(item => ({ ...item }))
  const detector = await loadLocalDetector()
  return detectMultipass(detector, image)
}
