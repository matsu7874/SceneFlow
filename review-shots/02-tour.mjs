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
await record('19:05', '医師クレア', '書斎', '一通の手紙を盗み読む')
await record('19:10', '執事トマス', '大広間', 'アリスにワインを手渡す')
await record('19:15', '令嬢アリス', '大広間', 'ワインを一口飲む')
await record('19:20', '医師クレア', '大広間', '倒れたアリスに駆け寄る')
await page.waitForTimeout(300)

async function tour(path, name) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: false })
  const t = (await page.locator('body').innerText()).replace(/\n{2,}/g,'\n').slice(0, 900)
  console.log(`\n===== ${name} (${path}) =====\n${t}`)
}
await tour('/entities', '03-entities')
await tour('/relationships', '04-relationships')
await tour('/map-editor', '05-map-editor')
await tour('/causality', '06-causality')
await tour('/validation', '07-validation')
await tour('/simulation', '08-simulation')
await tour('/spatial', '09-spatial')
await browser.close()
console.log('\nDONE')
