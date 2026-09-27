import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastOn, DEFAULT_INK, INK_PALETTE, applyInk, inkFromSettings, inkSetting, parseInk } from '../src/ink.js'
import { renderLabelRgba } from '../src/label-render.js'

test('ink defaults to rose and picks readable text', () => {
  assert.equal(DEFAULT_INK, '#D12A74')
  assert.equal(parseInk('#d12a74'), '#D12A74')
  assert.equal(parseInk('rose'), '')
  assert.equal(parseInk('#fff'), '')
  assert.equal(contrastOn('#D12A74'), '#FFFFFF')
  assert.equal(contrastOn('#F4E04D'), '#161513')
  assert.equal(contrastOn('#FFFFFF'), '#161513')
  assert.equal(contrastOn(''), '#FFFFFF')
  assert.equal(INK_PALETTE.some(item => item.hex === DEFAULT_INK && item.name === 'Rose'), true)
  assert.deepEqual(INK_PALETTE.map(item => item.name), ['Rose', 'Orange', 'Rouge', 'Vert', 'Bleu', 'Violet'])
  const row = inkSetting('#1D4E89')
  assert.equal(inkFromSettings([row]), '#1D4E89')
  assert.equal(inkFromSettings([]), '')
  assert.equal(row.onInk, '#FFFFFF')
  assert.deepEqual(applyInk('#1E7A46'), { ink: '#1E7A46', onInk: '#FFFFFF' })
  assert.deepEqual(applyInk('n importe quoi'), { ink: DEFAULT_INK, onInk: '#FFFFFF' })
})

test('thermal labels stay black so the QR does not take the ink', () => {
  const image = renderLabelRgba({ name: 'Bouteille', shortId: 'ABC12', qrText: 'https://exemple.invalid/mise/', location: 'Caisse', category: 'Objet' })
  let thermal = 0
  let rose = 0
  const data = image.rgba
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === 16 && data[i + 1] === 8 && data[i + 2] === 12) thermal += 1
    if (data[i] === 209 && data[i + 1] === 42 && data[i + 2] === 116) rose += 1
  }
  assert.ok(thermal > 20)
  assert.equal(rose, 0)
})
