import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { APP_VERSION, APP_VERSION_CODE } from '../src/version.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('0.4.0-beta.3 is the same version in the app, the package, Android and the service worker', () => {
  assert.equal(APP_VERSION, '0.4.0-beta.3')
  assert.equal(APP_VERSION_CODE, 15)
  assert.equal(JSON.parse(read('../package.json')).version, APP_VERSION)
  assert.equal(JSON.parse(read('../public/version.json')).version, APP_VERSION)
  assert.match(read('../android/app/build.gradle.kts'), new RegExp(`versionCode = ${APP_VERSION_CODE}`))
  assert.match(read('../android/app/build.gradle.kts'), new RegExp(`versionName = "${APP_VERSION}"`))
  assert.match(read('../android/app/src/main/java/fr/acousmatictheatre/mises/MainActivity.java'), /package fr\.acousmatictheatre\.mises/)
  assert.ok(read('../android/app/src/main/java/fr/acousmatictheatre/mises/MainActivity.java').includes('MISES-Android/0.4.0-beta.3'))
  assert.ok(read('../vite.config.js').includes("cacheId:'mises-0.4.0-beta.3'"))
  assert.match(read('../android/app/build.gradle.kts'), /val playApplicationId = "fr\.acousmatictheatre\.mises"/)
  assert.match(read('../android/app/build.gradle.kts'), /namespace = playApplicationId/)
  assert.match(read('../android/app/build.gradle.kts'), /applicationId = playApplicationId/)
  assert.match(read('../src/main.js'), /\$\{APP_VERSION\}/)
  assert.match(read('../android/app/src/main/java/fr/acousmatictheatre/mises/NativePrinterBridge.java'), /package fr\.acousmatictheatre\.mises/)
  assert.match(read('../android/app/src/main/java/fr/acousmatictheatre/mises/NativePrinterBridge.java'), /printWithSystem/)
  assert.match(read('../android/app/src/main/java/fr/acousmatictheatre/mises/AndroidShellBridge.java'), /package fr\.acousmatictheatre\.mises/)
  assert.match(read('../android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'), /monochrome/)
})

test('release build refuses debug signing as PLAY', () => {
  const gradle = read('../android/app/build.gradle.kts')
  assert.match(gradle, /Build Play\/release refusé/)
  assert.match(gradle, /MISE_UPLOAD_STORE_FILE/)
  assert.doesNotMatch(gradle, /signingConfigs\.getByName\("debug"\)/)
})
