import test from 'node:test'
import assert from 'node:assert/strict'
import { labelPngFileName, printerDisplayState } from '../src/desktop-print.js'

test('desktop export gives a safe, deterministic PNG name',()=>{
  assert.equal(labelPngFileName('Valise Bruitage / Été'), 'MISES-Valise-Bruitage-Ete.png')
  assert.equal(labelPngFileName('../..'), 'MISES-etiquette.png')
  assert.ok(labelPngFileName('a'.repeat(200)).length<90)
})

test('browser must not pretend a BLE pairing enables direct YHK/SPP printing',()=>{
  assert.deepEqual(printerDisplayState({nativeBridge:false,savedPrinterName:'YHK-1234'}),{
    label:'Imprimer · Ordinateur',connected:false,mode:'system-or-png'
  })
  assert.equal(printerDisplayState({nativeBridge:true,savedPrinterName:'YHK-1234'}).connected,true)
  assert.equal(printerDisplayState({nativeBridge:true}).connected,false)
})
