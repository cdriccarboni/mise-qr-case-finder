import { test, expect } from '@playwright/test'

const cdnHosts=new Set(['esm.sh','cdn.jsdelivr.net','jsdelivr.com','unpkg.com','cdnjs.cloudflare.com','cdnjs.com','skypack.dev','cdn.sheetjs.com'])

test('le bundle chargé ne contacte aucun CDN tiers', async ({ page }) => {
  const requests=[]
  page.on('request',request=>{
    const host=new URL(request.url()).hostname
    if(host!=='localhost'&&host!=='127.0.0.1'&&cdnHosts.has(host)) requests.push(request.url())
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(requests).toEqual([])
})
