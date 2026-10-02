import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8')

test('all dialogs close from the backdrop and mobile Back closes overlays before navigation',()=>{
  assert.match(main,/function isDialogBackdropClick\(dialog,event\)/)
  assert.match(main,/\$\$\('dialog'\)\.forEach/)
  assert.match(main,/function closeDialogFromBackdrop\(dialog\)/)
  assert.match(main,/dialog\.id==='scanDlg'/)
  assert.doesNotMatch(main,/aboutReturnsToPreferences|preferencesAbout|aboutDlg/)
  assert.match(main,/id="preferencesShare"/)
  assert.match(main,/function handleBackNavigation\(\)/)
  assert.match(main,/const openDialogs=\$\$\('dialog\[open\]'\)/)
  assert.match(main,/\$\('#scanDlg'\)\.addEventListener\('cancel'/)
})
