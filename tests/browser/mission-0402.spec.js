import { test, expect } from '@playwright/test'

test('0.4.0-beta.7 label editor, import surface and index diagnostics', async ({ page }) => {
  const errors=[]
  page.on('pageerror', error=>errors.push(error.message))
  await page.addInitScript(() => {
    window.__prints=[]
    window.MisesAndroidPrinter={
      listPairedPrinters:()=> '[]',
      printImages:()=>{},
      openBluetoothSettings:()=>{},
      printWithSystem:(name,dataUrl)=>window.__prints.push({name,dataUrl})
    }
  })
  await page.goto('/')
  await expect(page.locator('#appVersion')).toHaveText('0.4.0-beta.7')

  await page.locator('[data-action="label"]').click()
  const editor=page.locator('.labelEditorDialog')
  await expect(editor).toBeVisible()
  await expect(editor).toContainText('Créer une étiquette')
  await editor.locator('[data-add-text]').click()
  await editor.locator('[data-text]').fill('CAISSE 23\nACCESSOIRES')
  await editor.locator('[data-bold]').check()
  await editor.locator('[data-thermal]').check()
  await editor.locator('[data-orientation]').selectOption('vertical')
  await expect(editor.locator('canvas')).toBeVisible()
  await editor.locator('[data-print]').click()
  await expect.poll(()=>page.evaluate(()=>window.__prints.length)).toBe(1)
  expect((await page.evaluate(()=>window.__prints[0].dataUrl))).toMatch(/^data:image\/png/)
  await editor.locator('[data-close]').click()

  await page.locator('#preferencesBtn').click()
  const prefs=page.locator('#preferencesDlg')
  await expect(prefs).toBeVisible()
  await expect(prefs).toContainText('PDF · Word · Excel · ODS · CSV/TSV · JSON · Markdown · ZIP · images')
  await expect(prefs.locator('#indexState')).toContainText('recettes Web')
  await expect(prefs.locator('#visionState')).toContainText('Vision standard disponible')
  await prefs.locator('#preferencesIndexState').click()
  await expect(page.locator('#modal')).toContainText('État de l’index')
  await expect(page.locator('#modal')).toContainText('instruments')
  await page.locator('#closeIndexDiag').click()
  await expect(errors).toEqual([])
})
