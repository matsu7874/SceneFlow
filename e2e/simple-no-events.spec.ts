import { test, expect } from '@playwright/test'

test('eventsなしJSONロードテスト', async ({ page }) => {
  // シミュレーションページへ移動
  await page.goto('http://localhost:3000/simulation')

  // ページが読み込まれるまで待つ
  await page.waitForSelector('textarea', { timeout: 10000 })

  // eventsフィールドのないJSONデータ
  const jsonData = {
    persons: [{ id: 1, name: 'Test', color: '#FF0000' }],
    locations: [{ id: 1, name: 'Room', connections: [] }],
    acts: [{ id: 1, personId: 1, locationId: 1, time: '09:00:00', description: 'Test act' }],
    props: [],
    informations: [],
    initialStates: [{ personId: 1, locationId: 1, time: '09:00:00' }],
  }

  // JSONデータを入力
  await page.locator('textarea').fill(JSON.stringify(jsonData, null, 2))

  // ロードボタンをクリック
  await page.getByRole('button', { name: '物語データをロード' }).click()

  // エラー表示を確認
  await page.waitForTimeout(500)
  const errorElements = await page.locator('.error-output').all()

  // エラーメッセージを表示（もしあれば）
  for (const error of errorElements) {
    const isVisible = await error.isVisible()
    if (isVisible) {
      const text = await error.textContent()
      console.log('Error found:', text)
      throw new Error(`Error displayed: ${text}`)
    }
  }

  // データがロードされたことを確認
  const personName = await page.locator('text=Test').first()
  await expect(personName).toBeVisible({ timeout: 5000 })

  console.log('✅ eventsフィールドなしのJSONが正常にロードされました')
})