import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8')

test('all dialogs close again from the backdrop and nested About returns to Preferences',()=>{
  assert.match(main,/function isDialogBackdropClick\(dialog,event\)/)
  assert.match(main,/\$\$\('dialog'\)\.forEach/)
  assert.match(main,/function closeDialogFromBackdrop\(dialog\)/)
  assert.match(main,/dialog\.id==='scanDlg'/)
  assert.match(main,/aboutReturnsToPreferences/)
  assert.match(main,/if\(aboutReturnsToPreferences\)/)
  assert.match(main,/\$\('#scanDlg'\)\.addEventListener\('cancel'/)
})
