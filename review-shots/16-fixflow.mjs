import { launch } from './_lib.mjs'
const { browser, page } = await launch()
const SHOT = '/home/user/SceneFlow/review-shots'
const base = 'http://localhost:3000'
await page.goto(`${base}/log`, { waitUntil: 'networkidle' })
async function record(time, who, where, what) {
  await page.getByLabel('時刻').fill(time)
  const a = page.getByLabel('誰が'); await a.click(); await a.fill(who); await page.keyboard.press('Enter')
  const b = page.getByLabel('どこで'); await b.click(); await b.fill(where); await page.keyboard.press('Enter')
  const c = page.getByLabel('何をした'); await c.click(); await c.fill(what); await page.keyboard.press('Enter')
  await page.waitForTimeout(120)
}
await record('19:00', '令嬢アリス', '大広間', '招待客を出迎える')
await record('19:00', '執事トマス', '厨房', '毒入りのワインを用意する')
await record('19:10', '執事トマス', '大広間', 'アリスにワインを手渡す')
await page.waitForTimeout(300)

// expand the トマス @19:10 row (the one with warning). Toggle buttons by aria-label
const toggles = page.locator('button[aria-label*="詳細を"]')
const n = await toggles.count()
console.log('rows:', n)
// the warning row is the 3rd act -> find by text
const row = page.locator('li', { hasText: 'アリスにワインを手渡す' }).first()
await row.locator('button[aria-label*="詳細を"]').click()
await page.waitForTimeout(300)
// set 種類 to 移動
const kindSelect = row.locator('label', { hasText: '種類' }).locator('select')
await kindSelect.selectOption({ label: '移動' })
await page.waitForTimeout(400)
await page.screenshot({ path: `${SHOT}/16-fix-move.png` })
// read tooltip / warning text from validation page
await page.goto(`${base}/validation`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const v = (await page.locator('body').innerText()).replace(/\n{2,}/g,'\n')
console.log('=== validation after setting MOVE ===')
console.log(v.slice(v.indexOf('検証'), v.indexOf('検証')+500))
await browser.close()
console.log('DONE')
