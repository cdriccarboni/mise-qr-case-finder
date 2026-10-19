import zxing from '@zxing/library'

const { RGBLuminanceSource, BinaryBitmap, HybridBinarizer, GlobalHistogramBinarizer, QRCodeReader, DecodeHintType } = zxing
const HINTS = new Map([[DecodeHintType.TRY_HARDER, true]])
const PURE = new Map([[DecodeHintType.PURE_BARCODE, true]])

function attempt(image, hints = HINTS) {
  const pixels = new Int32Array(image.width * image.height)
  for (let i = 0; i < pixels.length; i++) {
    const r = image.rgba[i * 4], g = image.rgba[i * 4 + 1], b = image.rgba[i * 4 + 2]
    pixels[i] = (255 << 24) | (r << 16) | (g << 8) | b
  }
  const source = new RGBLuminanceSource(pixels, image.width, image.height)
  const reader = new QRCodeReader()
  try {
    return reader.decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText()
  } catch {
    return reader.decode(new BinaryBitmap(new GlobalHistogramBinarizer(source)), HINTS).getText()
  }
}
function scale(image, f) {
  const w = Math.floor(image.width * f), h = Math.floor(image.height * f), rgba = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(image.width - 1, Math.floor(x / f)), sy = Math.min(image.height - 1, Math.floor(y / f))
    rgba.set(image.rgba.subarray((sy * image.width + sx) * 4, (sy * image.width + sx) * 4 + 4), (y * w + x) * 4)
  }
  return { rgba, width: w, height: h }
}
/**
 * Décodeur de test (zxing-js). Son détecteur de motifs rate parfois un QR pourtant exact au module près
 * (cas « KIT-ACOUSTIQUE-CC » à 7 pts/module, décodé par zxing-cpp) : on réessaie à d'autres échelles,
 * comme le ferait un téléphone à une autre distance.
 */
export function decodeQrImage(image) {
  let last
  for (const f of [1, 0.5, 0.75, 1.5]) {
    try { return attempt(f === 1 ? image : scale(image, f)) } catch (e) { last = e }
  }
  // Dernier recours : QR isolé (carré d'encre englobant, zone calme de 4 modules) en mode PURE_BARCODE.
  try { return attempt(isolate(image), PURE) } catch (e) { last = e }
  throw last
}
function isolate(image) {
  const S = Math.min(image.width, image.height), dark = (x, y) => image.rgba[(y * image.width + x) * 4] < 128
  let x0 = S, y0 = S, x1 = -1, y1 = -1
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (dark(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const pad = 28, w = x1 - x0 + 1 + pad * 2, h = y1 - y0 + 1 + pad * 2, rgba = new Uint8ClampedArray(w * h * 4).fill(255)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) rgba.set(image.rgba.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4), ((y - y0 + pad) * w + x - x0 + pad) * 4)
  return { rgba, width: w, height: h }
}
