import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const forbidden=['esm.sh','jsdelivr','unpkg','cdnjs','skypack','cdn.sheetjs.com']
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)])

test('le bundle distribué ne référence aucun CDN tiers', {skip:!existsSync('dist')&&'dist absent : npm run build requis'}, () => {
  const offenders=[]
  for(const file of walk('dist')){
    const text=readFileSync(file,'utf8').toLowerCase()
    for(const host of forbidden) if(text.includes(host)) offenders.push(`${file}: ${host}`)
  }
  assert.deepEqual(offenders,[])
})
