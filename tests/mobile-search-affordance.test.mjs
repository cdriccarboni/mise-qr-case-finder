import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8')
const css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8')

test('mobile search has an explicit action and result reveal',()=>{
  assert.match(main,/id="searchGo"/)
  assert.match(main,/function revealSearchResults\(\)/)
  assert.match(main,/scrollIntoView/)
  assert.match(main,/\.goalNav details\[open\]/)
  assert.match(css,/mobile search affordance/)
})
