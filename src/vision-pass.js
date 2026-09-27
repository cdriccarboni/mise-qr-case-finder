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

// A crop sometimes renames the same object (a bottle becomes a vase). That is not a second prop.
const CONFUSED_WITH = {
  bottle: ['cup', 'vase', 'wine glass'],
  'wine glass': ['cup', 'vase', 'bowl', 'bottle'],
  bowl: ['wine glass', 'cup', 'vase'],
  cup: ['bowl', 'wine glass', 'vase', 'bottle'],
  book: ['toothbrush', 'remote', 'cell phone'],
  vase: ['bottle', 'cup', 'wine glass']
}

function pass(name, x, y, w, h, scale, minScore, max, rotation) {
  return { name, x, y, w, h, scale, minScore, max, rotation }
}

// Full frame, a center crop, a closer scale, four overlapping tiles, then one quarter-turn.
export function planPasses(width, height) {
  const w = Math.max(1, Number(width) || 1)
  const h = Math.max(1, Number(height) || 1)
  const tw = w * 0.61
  const th = h * 0.61
  const tiles = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([col, row]) => pass(
    `tuile-${col}${row}`,
    col ? w - tw : 0,
    row ? h - th : 0,
    tw,
    th,
    1,
    0.34,
    12,
    0
  ))
  const zoomW = w * 0.62
  const zoomH = h * 0.62
  return [
    pass('entier', 0, 0, w, h, 1, 0.28, 30, 0),
    pass('centre', w * 0.14, h * 0.14, w * 0.72, h * 0.72, 1, 0.3, 16, 0),
    pass('zoom', (w - zoomW) / 2, (h - zoomH) / 2, zoomW, zoomH, 1.4, 0.32, 16, 0),
    ...tiles,
    pass('rotation', 0, 0, w, h, 1, 0.5, 12, 90)
  ]
}

// Boxes come back in the canvas of the pass. Put them back on the original photo.
// Rotation is 90° clockwise: canvas size (height × width), origin translated to the right edge.
export function mapDetection(det, pass, imageWidth, imageHeight) {
  const [x, y, w, h] = det.bbox || [0, 0, 0, 0]
  const scale = pass.scale || 1
  const bbox = pass.rotation === 90
    ? [y / scale, imageHeight - (x + w) / scale, h / scale, w / scale]
    : [pass.x + x / scale, pass.y + y / scale, w / scale, h / scale]
  const imageArea = Math.max(1, imageWidth * imageHeight)
  return { ...det, bbox, pass: pass.name, areaRatio: (bbox[2] * bbox[3]) / imageArea }
}

export function fuseDetections(list, iouThreshold = 0.45) {
  const sorted = [...(list || [])].filter(item => item && item.bbox).sort((a, b) => (b.score || 0) - (a.score || 0))
  const kept = []
  for (const det of sorted) {
    const label = det.class || det.label
    const friend = kept.find(item => (item.class || item.label) === label && (intersectionOverUnion(item.bbox, det.bbox) >= iouThreshold || sameObject(item.bbox, det.bbox)))
    if (friend) {
      friend.support = (friend.support || 1) + 1
      friend.score = Math.min(0.99, Math.max(friend.score || 0, det.score || 0) + 0.02)
      if (det.pass === 'entier') friend.pass = 'entier'
      continue
    }
    kept.push({ ...det, support: 1 })
  }
  const full = kept.filter(item => item.pass === 'entier')
  return kept.filter(item => {
    if (item.pass === 'entier') return (item.score || 0) >= 0.28
    const label = item.class || item.label
    const rivals = full.some(other => {
      const otherLabel = other.class || other.label
      if (otherLabel === label) return false
      const confused = (CONFUSED_WITH[otherLabel] || []).includes(label)
      if (!confused) return false
      return intersectionOverUnion(other.bbox, item.bbox) >= 0.2 || centerInside(other.bbox, item.bbox)
    })
    if (rivals) return false
    if ((item.support || 1) >= 2 && (item.score || 0) >= 0.4) return true
    return (item.score || 0) >= 0.62
  })
}
