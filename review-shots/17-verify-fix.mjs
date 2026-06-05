import { launch } from './_lib.mjs'
const { browser, page } = await launch()
const SHOT = '/home/user/SceneFlow/review-shots'
const base = 'http://localhost:3000'
await page.goto(`${base}/simulation`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.getByText('学院ミステリのサンプルを入力', { exact: false }).click()
await page.waitForTimeout(200)
await page.getByText('物語データをロード', { exact: false }).click()
await page.waitForTimeout(600)

// Spatial view should now render (was empty before)
await page.goto(`${base}/spatial`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.screenshot({ path: `${SHOT}/17-spatial-fixed.png` })
const locNodes = await page.locator('[data-testid^="spatial-loc-"]').count()
const paths = await page.locator('[data-testid^="spatial-path-"]').count()
console.log('SPATIAL location nodes rendered:', locNodes, ' movement paths:', paths)

// Relationships diagram should now show edges
await page.goto(`${base}/relationships`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.screenshot({ path: `${SHOT}/18-relationships-fixed.png` })

await browser.close()
console.log('DONE')
