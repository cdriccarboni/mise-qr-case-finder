import { writeFileSync } from 'node:fs'
import { renderIconRgba } from '../src/label-render.js'
import { rgbaToPngBuffer } from '../src/png.js'

function write(path, size, padding) {
  const image = renderIconRgba(size, { background: [224, 0, 120, 255], foreground: [196, 0, 104, 255], padding })
  writeFileSync(path, rgbaToPngBuffer(image.rgba, image.width, image.height))
}
write(new URL('../public/icon-192.png', import.meta.url), 192, 0.16)
write(new URL('../public/icon-512.png', import.meta.url), 512, 0.22)
write(new URL('../public/apple-touch-icon.png', import.meta.url), 180, 0.14)
console.log('icons written')
