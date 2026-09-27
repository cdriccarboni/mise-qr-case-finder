export const DEFAULT_INK = '#D12A74'
export const INK_PALETTE = [
  { id: 'rose', name: 'Rose', hex: '#D12A74' },
  { id: 'orange', name: 'Orange', hex: '#E25A1C' },
  { id: 'rouge', name: 'Rouge', hex: '#C0392B' },
  { id: 'vert', name: 'Vert', hex: '#1E7A46' },
  { id: 'bleu', name: 'Bleu', hex: '#1D4E89' },
  { id: 'violet', name: 'Violet', hex: '#6B3FA0' }
]

export function parseInk(value) {
  const hex = String(value || '').trim().toUpperCase()
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : ''
}

function channel(hex, index) {
  return Number.parseInt(hex.slice(index, index + 2), 16) / 255
}
function linear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}
export function contrastOn(hex) {
  const ink = parseInk(hex) || DEFAULT_INK
  const r = linear(channel(ink, 1))
  const g = linear(channel(ink, 3))
  const b = linear(channel(ink, 5))
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const white = 1.05 / (luminance + 0.05)
  const black = (luminance + 0.05) / 0.05
  return white >= black ? '#FFFFFF' : '#161513'
}

export function inkSetting(hex) {
  const ink = parseInk(hex) || DEFAULT_INK
  return { id: 'ink', hex: ink, onInk: contrastOn(ink) }
}

export function inkFromSettings(settings) {
  const row = (settings || []).find(item => item?.id === 'ink')
  return parseInk(row?.hex) || ''
}

let iconSvg = ''
function paintAppIcon(ink, onInk) {
  const doc = globalThis.document
  if (!doc) return
  const links = [...doc.querySelectorAll('link[rel="icon"]')]
  if (!links.length) return
  const paint = svg => {
    const current = parseInk(doc.documentElement.style.getPropertyValue('--ink')) || ink
    const readable = contrastOn(current)
    const next = svg.replaceAll('#D12A74', current).replaceAll('#d12a74', current).replaceAll('#fff', readable).replaceAll('#FFF', readable)
    const href = `data:image/svg+xml,${encodeURIComponent(next)}`
    for (const link of links) if (!link.href.startsWith('data:') || iconSvg) link.href = href
  }
  if (iconSvg) { paint(iconSvg); return }
  const source = links.find(link => link.href && !link.href.startsWith('data:'))
  if (!source) return
  fetch(source.href).then(response => response.ok ? response.text() : '').then(text => {
    if (!text.includes('<svg')) return
    iconSvg = text
    paint(text)
  }).catch(() => {})
}

export function applyInk(hex) {
  const ink = parseInk(hex) || DEFAULT_INK
  const onInk = contrastOn(ink)
  const root = globalThis.document?.documentElement
  if (!root) return { ink, onInk }
  root.style.setProperty('--ink', ink)
  root.style.setProperty('--on-ink', onInk)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ink)
  paintAppIcon(ink, onInk)
  return { ink, onInk }
}
