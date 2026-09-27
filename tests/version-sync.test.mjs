import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { APP_VERSION, APP_VERSION_CODE } from '../src/version.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('0.3.0-beta.2 is the same version in the app, the package, Android and the service worker', () => {
  assert.equal(APP_VERSION, '0.3.0-beta.2')
  assert.equal(APP_VERSION_CODE, 7)
  assert.equal(JSON.parse(read('../package.json')).version, APP_VERSION)
  assert.equal(JSON.parse(read('../public/version.json')).version, APP_VERSION)
  assert.match(read('../android/app/build.gradle.kts'), new RegExp(`versionCode = ${APP_VERSION_CODE}`))
  assert.match(read('../android/app/build.gradle.kts'), new RegExp(`versionName = "${APP_VERSION}"`))
  assert.match(read('../android/app/src/main/java/fr/acousmatictheatre/mise/MainActivity.java'), /MISE-Android\/0\.3\.0-beta\.2/)
  assert.match(read('../vite.config.js'), /cacheId:'mise-0\.3\.0-beta\.2'/)
  assert.match(read('../src/main.js'), /\$\{APP_VERSION\}/)
  assert.match(read('../android/app/src/main/java/fr/acousmatictheatre/mise/NativePrinterBridge.java'), /printWithSystem/)
  assert.match(read('../android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'), /monochrome/)
})
