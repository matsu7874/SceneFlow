import { launch } from './_lib.mjs'
const { browser, page } = await launch()
const SHOT = '/home/user/SceneFlow/review-shots'

await page.goto('http://localhost:3000/log', { waitUntil: 'networkidle' })

// helper: record one event as a writer would type it
async function record(time, who, where, what) {
  await page.getByLabel('時刻').fill(time)
  const whoBox = page.getByLabel('誰が')
  await whoBox.click(); await whoBox.fill(who); await page.keyboard.press('Enter')
  const whereBox = page.getByLabel('どこで')
  await whereBox.click(); await whereBox.fill(where); await page.keyboard.press('Enter')
  const what1 = page.getByLabel('何をした')
  await what1.click(); await what1.fill(what); await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
}

// An immersive theatre micro-piece: 3 characters, 3 rooms, simultaneous action
await record('19:00', '令嬢アリス', '大広間', '招待客を出迎える')
await record('19:00', '執事トマス', '厨房', '毒入りのワインを用意する')
await record('19:05', '医師クレア', '書斎', '一通の手紙を盗み読む')
await record('19:10', '執事トマス', '大広間', 'アリスにワインを手渡す')
await record('19:15', '令嬢アリス', '大広間', 'ワインを一口飲む')
await record('19:20', '医師クレア', '大広間', '倒れたアリスに駆け寄る')

await page.waitForTimeout(400)
await page.screenshot({ path: `${SHOT}/01-quicklog-full.png`, fullPage: true })

// report the timeline text
const text = await page.locator('body').innerText()
console.log('=== PAGE TEXT (first 1500) ===')
console.log(text.slice(0, 1500))

// dump localStorage to see persisted shape
const ls = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).reduce((a,k)=>{a[k]=localStorage.getItem(k)?.length;return a},{})))
console.log('LOCALSTORAGE KEYS/len:', ls)
await browser.close()
console.log('DONE')
