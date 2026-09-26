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
export async function detectLocal(image) {
  const detector = await loadLocalDetector()
  return detector.detect(image, 40, .35)
}
