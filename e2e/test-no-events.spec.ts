import { test, expect } from '@playwright/test'

const testDataWithoutEvents = {
  persons: [
    { id: 1, name: 'テスト太郎', color: '#FF0000' },
    { id: 2, name: 'テスト花子', color: '#00FF00' },
  ],
  locations: [
    { id: 101, name: 'テスト広場', connections: [102] },
    { id: 102, name: 'テスト図書館', connections: [101] },
  ],
  acts: [
    { id: 1, personId: 1, locationId: 101, time: '09:00:00', description: '太郎が広場に到着' },
    { id: 2, personId: 2, locationId: 102, time: '09:15:00', description: '花子が図書館で読書' },
    { id: 3, personId: 1, locationId: 102, time: '09:30:00', description: '太郎が図書館へ移動' },
  ],
  props: [],
  informations: [],
  initialStates: [
    { personId: 1, locationId: 101, time: '09:00:00' },
    { personId: 2, locationId: 102, time: '09:00:00' },
  ],
}

test('eventsフィールドのないJSONが読み込めることを確認', async ({ page }) => {
  // アプリケーションにアクセス
  await page.goto('http://localhost:3000/simulation')

  // JSONデータを入力エリアに貼り付け
  const textarea = page.locator('textarea').first()
  await textarea.fill(JSON.stringify(testDataWithoutEvents, null, 2))

  // ロードボタンをクリック
  await page.getByRole('button', { name: '物語データをロード' }).click()

  // 少し待つ
  await page.waitForTimeout(1000)

  // エラーが表示されないことを確認
  const errorOutput = page.locator('.error-output')
  const isErrorVisible = await errorOutput.isVisible()
  if (isErrorVisible) {
    const errorText = await errorOutput.textContent()
    console.error('エラーが表示されました:', errorText)
  }
  await expect(errorOutput).not.toBeVisible()

  // 成功通知を探す（複数の可能性を考慮）
  const successIndicators = [
    page.locator('text=データが正常にロードされました'),
    page.locator('text=成功'),
    page.locator('.notification').filter({ hasText: /success/i }),
    // データが実際にロードされたことを確認
    page.locator('text=テスト太郎'),
    page.locator('text=テスト花子'),
  ]

  // いずれかの成功指標が表示されることを確認
  let loadSuccess = false
  for (const indicator of successIndicators) {
    if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      loadSuccess = true
      break
    }
  }

  expect(loadSuccess).toBe(true)

  // キャラクターが表示されていることを確認
  await expect(page.locator('text=テスト太郎')).toBeVisible()
  await expect(page.locator('text=テスト花子')).toBeVisible()

  // 場所が表示されていることを確認
  await expect(page.locator('text=テスト広場')).toBeVisible()
  await expect(page.locator('text=テスト図書館')).toBeVisible()

  // シミュレーション制御が有効になっていることを確認
  const playButton = page.getByRole('button', { name: /再生|Play/i })
  await expect(playButton).toBeEnabled()

  // タイムラインスライダーが存在することを確認
  const timeline = page.locator('input[type="range"]')
  await expect(timeline).toBeVisible()

  // 再生して動作することを確認
  await playButton.click()

  // 時間が進むまで少し待つ
  await page.waitForTimeout(2000)

  // 一時停止
  const pauseButton = page.getByRole('button', { name: /一時停止|Pause/i })
  await pauseButton.click()

  // 時刻が進んでいることを確認（09:00:00以外の時刻）
  const timeDisplay = page.locator('.current-time-display')
  const currentTime = await timeDisplay.textContent()
  expect(currentTime).not.toBe('09:00:00')

  console.log('✅ eventsフィールドのないJSONデータが正常に読み込めました！')
  console.log('✅ シミュレーションも正常に動作しています！')
})