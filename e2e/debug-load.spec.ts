import { test, expect } from '@playwright/test'

test('ロード機能のデバッグ', async ({ page }) => {
  // ページ遷移のデバッグ
  page.on('console', msg => console.log('Browser console:', msg.text()))
  page.on('pageerror', error => console.error('Page error:', error.message))

  console.log('1. Navigating to /simulation...')
  await page.goto('http://localhost:3000/simulation', { waitUntil: 'networkidle' })

  // ページタイトル確認
  const title = await page.title()
  console.log('2. Page title:', title)

  // URL確認
  const url = page.url()
  console.log('3. Current URL:', url)

  // テキストエリアの存在確認
  console.log('4. Checking for textarea...')
  const textareaCount = await page.locator('textarea').count()
  console.log('   Textarea count:', textareaCount)

  if (textareaCount === 0) {
    // 全体のHTMLを確認
    const bodyText = await page.locator('body').innerText()
    console.log('5. Page body text (first 500 chars):', bodyText.substring(0, 500))

    // エラーメッセージの確認
    const errorElements = await page.locator('[class*="error"]').all()
    console.log('6. Error elements found:', errorElements.length)
    for (const el of errorElements) {
      const text = await el.textContent()
      console.log('   Error text:', text)
    }

    throw new Error('Textarea not found on the page')
  }

  // ボタンの存在確認
  console.log('7. Checking for load button...')
  const loadButtonText = ['物語データをロード', 'ロード', 'Load', 'load']
  let buttonFound = false

  for (const text of loadButtonText) {
    const button = page.getByRole('button', { name: text })
    const count = await button.count()
    if (count > 0) {
      console.log(`   Found button with text: "${text}"`)
      buttonFound = true
      break
    }
  }

  if (!buttonFound) {
    const allButtons = await page.locator('button').all()
    console.log('8. All buttons on page:', allButtons.length)
    for (const btn of allButtons) {
      const text = await btn.textContent()
      console.log(`   Button text: "${text}"`)
    }
  }

  // 最小限のJSONでテスト
  const minimalJson = {
    persons: [{ id: 1, name: 'X', color: '#000' }],
    locations: [{ id: 1, name: 'Y', connections: [] }],
    acts: [{ id: 1, personId: 1, locationId: 1, time: '00:00:00', description: 'Z' }],
    props: [],
    informations: [],
    initialStates: [],
  }

  console.log('9. Setting JSON data...')
  const textarea = page.locator('textarea').first()
  await textarea.fill(JSON.stringify(minimalJson))

  console.log('10. Clicking load button...')
  const loadButton = page.getByRole('button').filter({ hasText: /ロード|load/i }).first()
  await loadButton.click()

  console.log('11. Waiting for response...')
  await page.waitForTimeout(1000)

  // エラー確認
  const errorOutput = await page.locator('.error-output').textContent().catch(() => null)
  if (errorOutput) {
    console.log('12. Error output:', errorOutput)
  } else {
    console.log('12. No error output found')
  }

  // 成功の兆候を探す
  const personX = await page.locator('text=X').count()
  const locationY = await page.locator('text=Y').count()
  console.log('13. Found "X" (person):', personX, 'times')
  console.log('14. Found "Y" (location):', locationY, 'times')

  if (personX === 0 && locationY === 0) {
    throw new Error('Data was not loaded successfully')
  }

  console.log('✅ Load function appears to be working')
})