import { chromium } from '@playwright/test'
export const ARGS = ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--disable-gpu']
export async function launch() {
  const browser = await chromium.launch({ executablePath: '/tmp/chromium-bin', args: ARGS })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.log('PAGEERROR:', e.message))
  page.on('console', m => { if (m.type()==='error') console.log('CONSOLE.ERR:', m.text()) })
  return { browser, page }
}
