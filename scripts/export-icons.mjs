import { readFileSync, writeFileSync } from 'node:fs'
import { renderIconRgba } from '../src/label-render.js'
import { rgbaToPngBuffer } from '../src/png.js'

const css = readFileSync(new URL('../src/identity.css', import.meta.url), 'utf8')
const declared = css.match(/--ink:\s*(#[0-9A-Fa-f]{6})/)
if (!declared) throw new Error('--ink manquant dans src/identity.css')
const ink = declared[1].toUpperCase()

const selfUrl = new URL(import.meta.url)
const self = readFileSync(selfUrl, 'utf8')
const STAMP = '#0B3D91'

const copies = [
  '../public/icon.svg',
  '../public/favicon.svg',
  '../public/icon-maskable.svg',
  '../public/brand/logo.svg',
  '../public/brand/direction-onde.svg',
  '../public/brand/direction-scene.svg',
  '../public/brand/encre-bleu.svg',
  '../public/brand/encres.svg',
  '../index.html',
  '../vite.config.js',
  '../src/label-render.js',
  '../android/app/src/main/res/drawable/ic_launcher_background.xml',
  '../android/app/src/main/res/drawable/ic_launcher_foreground.xml',
  '../android/app/src/main/res/values/themes.xml',
  '../android/app/src/main/res/drawable/ic_launcher_mise.xml'
]

if (STAMP.toUpperCase() !== ink) {
  const from = new RegExp(STAMP, 'gi')
  for (const rel of copies) {
    const url = new URL(rel, import.meta.url)
    const text = readFileSync(url, 'utf8')
    const next = text.replace(from, ink)
    if (next !== text) writeFileSync(url, next)
  }
  writeFileSync(selfUrl, self.replace(`const STAMP = '${STAMP}'`, `const STAMP = '${ink}'`))
}

const rgb = [parseInt(ink.slice(1, 3), 16), parseInt(ink.slice(3, 5), 16), parseInt(ink.slice(5, 7), 16), 255]
function write(path, size, padding) {
  const image = renderIconRgba(size, { background: rgb, foreground: rgb, padding })
  writeFileSync(path, rgbaToPngBuffer(image.rgba, image.width, image.height))
}
write(new URL('../public/icon-192.png', import.meta.url), 192, 0.16)
write(new URL('../public/icon-512.png', import.meta.url), 512, 0.22)
write(new URL('../public/apple-touch-icon.png', import.meta.url), 180, 0.14)
console.log(`icons written ${ink}`)
