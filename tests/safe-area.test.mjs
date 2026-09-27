import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('Android applies the status bar, cutout and keyboard once, without a second CSS margin', () => {
  const java = read('../android/app/src/main/java/fr/acousmatictheatre/mises/MainActivity.java')
  const css = read('../src/style.css')
  const html = read('../index.html')
  assert.match(java, /setDecorFitsSystemWindows\(getWindow\(\), false\)/)
  assert.match(java, /setStatusBarColor\(Color\.TRANSPARENT\)/)
  assert.match(java, /setNavigationBarColor\(Color\.TRANSPARENT\)/)
  assert.match(java, /LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS/)
  assert.match(java, /Type\.systemBars\(\) \| WindowInsetsCompat\.Type\.displayCutout\(\)/)
  assert.match(java, /Type\.ime\(\)/)
  assert.match(java, /view\.setPadding\(safeLeft, safeTop, safeRight, safeBottom\)/)
  assert.match(java, /dataset\.nativeSafe='1'/)
  assert.match(java, /--android-safe-top','0px'/)
  assert.doesNotMatch(java, /--android-safe-top','" \+ safeTop/)
  assert.match(css, /padding:var\(--safe-top\) var\(--safe-right\) var\(--safe-bottom\) var\(--safe-left\)/)
  assert.match(css, /html\[data-native-safe\]\{--safe-top:0px;--safe-right:0px;--safe-bottom:0px;--safe-left:0px\}/)
  assert.doesNotMatch(css, /8rem \+ var\(--safe-bottom\)/)
  assert.doesNotMatch(css, /8\.5rem \+ var\(--safe-bottom\)/)
  assert.match(html, /viewport-fit=cover/)
  assert.match(html, /interactive-widget=resizes-content/)
  assert.match(read('../android/app/build.gradle.kts'), /MISE_UPLOAD_STORE_FILE/)
})
