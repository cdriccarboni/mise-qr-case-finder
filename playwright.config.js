import { defineConfig } from '@playwright/test'
const testPort=Number(process.env.MISES_TEST_PORT||4173)
const testOrigin=`http://127.0.0.1:${testPort}`
export default defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: { baseURL: testOrigin, browserName: 'chromium', headless: true },
  webServer: { command: `npm run preview -- --host 127.0.0.1 --port ${testPort} --strictPort`, url: testOrigin, reuseExistingServer: !process.env.CI && !process.env.MISES_TEST_PORT, timeout: 120000 }
})
