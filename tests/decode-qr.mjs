import zxing from '@zxing/library'

const { RGBLuminanceSource, BinaryBitmap, HybridBinarizer, GlobalHistogramBinarizer, QRCodeReader } = zxing

export function decodeQrImage(image) {
  const pixels = new Int32Array(image.width * image.height)
  for (let i = 0; i < pixels.length; i++) {
    const r = image.rgba[i * 4], g = image.rgba[i * 4 + 1], b = image.rgba[i * 4 + 2]
    pixels[i] = (255 << 24) | (r << 16) | (g << 8) | b
  }
  const source = new RGBLuminanceSource(pixels, image.width, image.height)
  const reader = new QRCodeReader()
  try {
    return reader.decode(new BinaryBitmap(new HybridBinarizer(source))).getText()
  } catch {
    return reader.decode(new BinaryBitmap(new GlobalHistogramBinarizer(source))).getText()
  }
}
