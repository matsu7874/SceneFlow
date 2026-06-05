import { launch } from './_lib.mjs'
const { browser, page } = await launch()
const SHOT = '/home/user/SceneFlow/review-shots'
const base = 'http://localhost:3000'

await page.goto(`${base}/simulation`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
// load the academy mystery sample
await page.getByText('学院ミステリのサンプルを入力', { exact: false }).click()
await page.waitForTimeout(300)
await page.getByText('物語データをロード', { exact: false }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${SHOT}/10-sim-loaded.png` })

// Play and advance
const play = page.getByRole('button', { name: /Play/ })
await play.click()
// pick fastest speed
try { await page.getByRole('combobox').selectOption('20') } catch(e){}
await page.waitForTimeout(3500)
await page.screenshot({ path: `${SHOT}/11-sim-playing.png` })
const simText = (await page.locator('body').innerText()).replace(/\n{2,}/g,'\n')
console.log('=== SIM (excerpt) ===')
const idx = simText.indexOf('実行ログ')
console.log(simText.slice(idx, idx+700))

// Validation with richer data
await page.goto(`${base}/validation`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: `${SHOT}/12-validation-sample.png` })
const v = (await page.locator('body').innerText()).replace(/\n{2,}/g,'\n')
console.log('\n=== VALIDATION (sample) ===\n' + v.slice(v.indexOf('検証'), v.indexOf('検証')+600))

// Causality with richer data
await page.goto(`${base}/causality`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${SHOT}/13-causality-sample.png` })

// Spatial
await page.goto(`${base}/spatial`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${SHOT}/14-spatial-sample.png` })

// Relationships
await page.goto(`${base}/relationships`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: `${SHOT}/15-relationships-sample.png` })

await browser.close()
console.log('\nDONE')
