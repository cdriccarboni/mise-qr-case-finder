import QRCode from 'qrcode'
import { shortId } from './qr-link.js'

const INK = [16, 8, 12, 255]
const PAPER = [255, 255, 255, 255]
const GLYPHS = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  '.': [0, 0, 0, 0, 0, 0b00100, 0b00100],
  '-': [0, 0, 0, 0b11111, 0, 0, 0],
  "'": [0b00100, 0b00100, 0, 0, 0, 0, 0],
  '*': [0b01110, 0b01010, 0b01110, 0, 0, 0, 0],
  '/': [0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0, 0],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b10000, 0b11110, 0b00001, 0b00001, 0b11110],
  '6': [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111]
}

export function createImage(width, height, color = PAPER) {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = color[0]; rgba[i * 4 + 1] = color[1]; rgba[i * 4 + 2] = color[2]; rgba[i * 4 + 3] = color[3] ?? 255
  }
  return {
    rgba, width, height,
    set(x, y, c) {
      x = Math.round(x); y = Math.round(y)
      if (x < 0 || y < 0 || x >= width || y >= height) return
      const i = (y * width + x) * 4
      rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = c[3] ?? 255
    },
    fillRect(x, y, w, h, c) {
      for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.set(xx, yy, c)
    }
  }
}

function stroke(img, x0, y0, x1, y1, width, color) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
  const r = Math.max(1, width / 2)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) img.set(x + dx, y + dy, color)
  }
}

export function paintMark(img, x, y, size, color) {
  const u = size / 64
  const L = (ax, ay, bx, by, w = 2.4) => stroke(img, x + ax * u, y + ay * u, x + bx * u, y + by * u, Math.max(1.5, w * u), color)
  L(12, 30, 32, 18); L(32, 18, 52, 30); L(12, 30, 12, 50); L(52, 30, 52, 50)
  L(12, 50, 32, 60); L(32, 60, 52, 50); L(12, 30, 32, 42); L(32, 42, 52, 30); L(32, 42, 32, 60)
  L(16, 16, 24, 10, 2); L(24, 10, 32, 16, 2); L(32, 16, 40, 10, 2); L(40, 10, 48, 16, 2)
  const cx = x + 50 * u, cy = y + 12 * u, rad = Math.max(2, 3.2 * u)
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad) img.set(cx + dx, cy + dy, color)
}

function foldLabel(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/°/g, '*').replace(/[^A-Z0-9 !.'*/-]/g, ' ').replace(/\s+/g, ' ').trim()
}

function drawText(img, text, x, y, scale, color, align = 'left') {
  const chars = [...foldLabel(text)]
  const width = chars.length * 6 * scale
  let cursor = align === 'center' ? x - width / 2 : x
  for (const ch of chars) {
    const glyph = GLYPHS[ch] || GLYPHS[' ']
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) if (glyph[row] & (1 << (4 - col))) img.fillRect(cursor + col * scale, y + row * scale, scale, scale, color)
    cursor += 6 * scale
  }
  return 8 * scale
}

function wrap(text, scale, maxWidth) {
  const words = foldLabel(text).split(' ').filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = (line ? `${line} ${word}` : word)
    if (line && next.length * 6 * scale > maxWidth) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}

function paintQr(img, text, left, top, maxSize) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const quiet = 6
  let scale = Math.floor(maxSize / (n + quiet * 2))
  if (scale < 4) scale = 4
  const size = (n + quiet * 2) * scale
  img.fillRect(left, top, size, size, PAPER)
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(row, col)) continue
      img.fillRect(left + (col + quiet) * scale, top + (row + quiet) * scale, scale, scale, INK)
    }
  }
  return size
}

export function renderLabelRgba(spec) {
  const width = 384
  const nameLines = wrap(spec.name || 'MISE', 3, 360)
  const extra = [spec.location, spec.category].filter(Boolean)
  const height = 150 + nameLines.length * 28 + 280 + extra.length * 22 + 36
  const img = createImage(width, height, PAPER)
  paintMark(img, 16, 12, 56, INK)
  drawText(img, 'MISE !', 84, 28, 4, INK)
  img.fillRect(20, 78, 344, 3, INK)
  let y = 92
  for (const line of nameLines) { drawText(img, line, width / 2, y, 3, INK, 'center'); y += 28 }
  const qrSize = paintQr(img, spec.qrText, Math.round((width - 280) / 2), y + 8, 280)
  y += qrSize + 16
  drawText(img, spec.shortId || shortId(spec.id), width / 2, y, 2, INK, 'center')
  y += 20
  for (const line of extra) { drawText(img, line, width / 2, y, 2, INK, 'center'); y += 20 }
  return { rgba: img.rgba, width, height, qrText: spec.qrText }
}

function fillCircle(img, cx, cy, radius, color) {
  const r2 = radius * radius
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy
      if (dx * dx + dy * dy <= r2) img.set(x, y, color)
    }
  }
}
function hexagon(img, cx, cy, radius, color, width) {
  const pts = []
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 3
    pts.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
  }
  for (let i = 0; i < 6; i++) stroke(img, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1], width, color)
}
export function renderIconRgba(size = 512, { background = [224, 0, 120, 255], foreground = [196, 0, 104, 255], padding = 0.3 } = {}) {
  const paper = [255, 255, 255, 255]
  const img = createImage(size, size, background)
  fillCircle(img, size * 0.48, size * 0.54, size * 0.3, paper)
  hexagon(img, size * 0.78, size * 0.2, size * 0.09, paper, Math.max(2, size * 0.012))
  const pad = Math.round(size * padding)
  paintMark(img, pad, pad + size * 0.04, size - pad * 2, foreground)
  return { rgba: img.rgba, width: size, height: size }
}

export function renderLabelDataUrl(spec) {
  const image = renderLabelRgba(spec)
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d').putImageData(new ImageData(image.rgba, image.width, image.height), 0, 0)
  return canvas.toDataURL('image/png')
}
