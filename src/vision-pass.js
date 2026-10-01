// Geometry for multipass detection. No model here: the same boxes can be tested without TensorFlow.

export function intersectionOverUnion(a, b) {
  if (!a || !b) return 0
  const [ax, ay, aw, ah] = a
  const [bx, by, bw, bh] = b
  const x1 = Math.max(ax, bx), y1 = Math.max(ay, by)
  const x2 = Math.min(ax + aw, bx + bw), y2 = Math.min(ay + ah, by + bh)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = aw * ah + bw * bh - inter
  return union <= 0 ? 0 : inter / union
}

function centerInside(outer, inner) {
  const [x, y, w, h] = inner
  const cx = x + w / 2, cy = y + h / 2
  const [ox, oy, ow, oh] = outer
  return cx >= ox && cx <= ox + ow && cy >= oy && cy <= oy + oh
}

function sameObject(a, b) {
  if (intersectionOverUnion(a, b) >= 0.3) return true
  const areaA = Math.max(1, a[2] * a[3]), areaB = Math.max(1, b[2] * b[3])
  const ratio = Math.min(areaA, areaB) / Math.max(areaA, areaB)
  return ratio >= 0.2 && (centerInside(a, b) || centerInside(b, a))
}

const CONFUSED_WITH = {
  bottle: ['cup', 'vase', 'wine glass'],
  'wine glass': ['cup', 'vase', 'bowl', 'bottle'],
  bowl: ['wine glass', 'cup', 'vase'],
  cup: ['bowl', 'wine glass', 'vase', 'bottle'],
  book: ['toothbrush', 'remote', 'cell phone'],
  vase: ['bottle', 'cup', 'wine glass']
}

function pass(name, x, y, w, h, scale, minScore, max, rotation = 0, tier = 'fast') {
  return { name, x, y, w, h, scale, minScore, max, rotation, tier }
}

// Fast passes cover the frame first. Dense overlapping tiles are only used when the
// first pass does not find enough candidates, which keeps simple photos quick while
// still giving crowded inventories a much denser second look.
export function planPasses(width, height) {
  const w = Math.max(1, Number(width) || 1)
  const h = Math.max(1, Number(height) || 1)
  const denseW = w * 0.48
  const denseH = h * 0.48
  const dense = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = (w - denseW) * (col / 2)
      const y = (h - denseH) * (row / 2)
      dense.push(pass(`tuile-${col}${row}`, x, y, denseW, denseH, 1.35, 0.2, 40, 0, 'dense'))
    }
  }
  const zoomW = w * 0.68
  const zoomH = h * 0.68
  return [
    pass('entier', 0, 0, w, h, 1, 0.22, 100, 0, 'fast'),
    pass('centre', w * 0.1, h * 0.1, w * 0.8, h * 0.8, 1.15, 0.24, 50, 0, 'fast'),
    pass('zoom', (w - zoomW) / 2, (h - zoomH) / 2, zoomW, zoomH, 1.45, 0.24, 50, 0, 'fast'),
    ...dense,
    pass('rotation', 0, 0, w, h, 1, 0.42, 24, 90, 'dense')
  ]
}

export function mapDetection(det, pass, imageWidth, imageHeight) {
  const [x, y, w, h] = det.bbox || [0, 0, 0, 0]
  const scale = pass.scale || 1
  const bbox = pass.rotation === 90
    ? [y / scale, imageHeight - (x + w) / scale, h / scale, w / scale]
    : [pass.x + x / scale, pass.y + y / scale, w / scale, h / scale]
  const imageArea = Math.max(1, imageWidth * imageHeight)
  return { ...det, bbox, pass: pass.name, tier: pass.tier || 'fast', areaRatio: (bbox[2] * bbox[3]) / imageArea }
}

export function fuseDetections(list, iouThreshold = 0.45) {
  const sorted = [...(list || [])].filter(item => item && item.bbox).sort((a, b) => (b.score || 0) - (a.score || 0))
  const kept = []
  for (const det of sorted) {
    const label = det.class || det.label
    const friend = kept.find(item => (item.class || item.label) === label && (intersectionOverUnion(item.bbox, det.bbox) >= iouThreshold || sameObject(item.bbox, det.bbox)))
    if (friend) {
      friend.support = (friend.support || 1) + 1
      friend.score = Math.min(0.99, Math.max(friend.score || 0, det.score || 0) + 0.018)
      if (det.pass === 'entier') friend.pass = 'entier'
      continue
    }
    kept.push({ ...det, support: 1 })
  }
  const full = kept.filter(item => item.pass === 'entier')
  return kept.filter(item => {
    if (item.pass === 'entier') return (item.score || 0) >= 0.22
    const label = item.class || item.label
    const rivals = full.some(other => {
      const otherLabel = other.class || other.label
      if (otherLabel === label) return false
      const confused = (CONFUSED_WITH[otherLabel] || []).includes(label)
      if (!confused) return false
      return intersectionOverUnion(other.bbox, item.bbox) >= 0.2 || centerInside(other.bbox, item.bbox)
    })
    if (rivals) return false
    if ((item.support || 1) >= 3 && (item.score || 0) >= 0.22) return true
    if ((item.support || 1) >= 2 && (item.score || 0) >= 0.3) return true
    return (item.score || 0) >= 0.56
  }).sort((a, b) => (b.score || 0) - (a.score || 0))
}
