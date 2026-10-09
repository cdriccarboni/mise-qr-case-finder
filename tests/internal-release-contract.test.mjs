import test from 'node:test'
import assert from 'node:assert/strict'
import { decideInternalRelease } from '../scripts/internal-release-contract.mjs'
const SHA = 'a'.repeat(40)
const gradle = (code, app='fr.acousmatictheatre.mises', version='0.4.0-beta.15') =>
  `val playApplicationId = "${app}"\nversionCode = ${code}\nversionName = "${version}"\n`
const params = (code=26, prev=25) => ({
  sourceSha: SHA, liveMainSha: SHA,
  packageJson: JSON.stringify({version:'0.4.0-beta.15'}),
  androidCurrent: gradle(code), androidPrevious: gradle(prev,'fr.acousmatictheatre.mises','0.4.0-beta.14'),
})
test('accepts internal-only Play release for incremented Android build',()=>{
  const r=decideInternalRelease(params()); assert.equal(r.eligible,true)
  assert.equal(r.track,'internal'); assert.equal(r.code,26)
})
test('never publishes unchanged versionCode',()=>{
  const r=decideInternalRelease(params(25,25)); assert.equal(r.eligible,false)
})
test('never publishes older Android build',()=>{
  const r=decideInternalRelease(params(24,25)); assert.equal(r.eligible,false)
})
test('ignores stale workflow runs after main changes',()=>{
  const x=params(); x.liveMainSha='b'.repeat(40)
  assert.equal(decideInternalRelease(x).eligible,false)
})
test('fails closed on package mismatch',()=>{
  const x=params(); x.androidCurrent=gradle(26,'com.fake.other')
  assert.throws(()=>decideInternalRelease(x), /applicationId/)
})
test('fails closed on inconsistent versionName',()=>{
  const x=params(); x.androidCurrent=gradle(26,undefined,'other.version')
  assert.throws(()=>decideInternalRelease(x), /versionName/)
})
