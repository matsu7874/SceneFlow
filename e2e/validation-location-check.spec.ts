import { test, expect } from '@playwright/test'

test.describe('検証タブの接続チェック', () => {
  test('正しく接続されたロケーションはエラーにならない', async ({ page }) => {
    // シミュレーションページに移動
    await page.goto('http://localhost:3000/simulation')
    await page.waitForLoadState('networkidle')

    // テストデータを作成（接続あり）
    const testData = {
      persons: [
        { id: 1, name: '桃太郎', color: '#FF0000' },
      ],
      locations: [
        { id: 101, name: '家', connections: [102] },
        { id: 102, name: '村', connections: [101, 103] },
        { id: 103, name: '山', connections: [102] },
        { id: 104, name: '川', connections: [102] }, // 104は102に接続
      ],
      acts: [],
      props: [],
      informations: [],
      initialStates: [
        { personId: 1, locationId: 101, time: '00:00:00' },
      ],
    }

    // データをロード
    const textarea = page.locator('textarea').first()
    await textarea.fill(JSON.stringify(testData, null, 2))

    const loadButton = page.getByRole('button', { name: '物語データをロード' })
    await loadButton.click()

    // ロード成功を待つ
    await page.locator('text=データが正常にロードされました').waitFor({ timeout: 5000 })

    // 検証タブに移動
    await page.getByRole('link', { name: '検証' }).click()
    await page.waitForTimeout(2000)

    // エラーメッセージが表示されないことを確認
    const errorText = await page.locator('text=Location "104" is not connected').count()
    expect(errorText).toBe(0)

    // スクリーンショット
    await page.screenshot({ path: 'validation-connected-locations.png', fullPage: true })
  })

  test('孤立したロケーションは警告が表示される', async ({ page }) => {
    // シミュレーションページに移動
    await page.goto('http://localhost:3000/simulation')
    await page.waitForLoadState('networkidle')

    // テストデータを作成（孤立したロケーション）
    const testData = {
      persons: [
        { id: 1, name: '桃太郎', color: '#FF0000' },
      ],
      locations: [
        { id: 101, name: '家', connections: [102] },
        { id: 102, name: '村', connections: [101] },
        { id: 104, name: '川', connections: [] }, // 104は接続なし
      ],
      acts: [],
      props: [],
      informations: [],
      initialStates: [
        { personId: 1, locationId: 101, time: '00:00:00' },
      ],
    }

    // データをロード
    const textarea = page.locator('textarea').first()
    await textarea.fill(JSON.stringify(testData, null, 2))

    const loadButton = page.getByRole('button', { name: '物語データをロード' })
    await loadButton.click()

    // ロード成功を待つ
    await page.locator('text=データが正常にロードされました').waitFor({ timeout: 5000 })

    // 検証タブに移動
    await page.getByRole('link', { name: '検証' }).click()
    await page.waitForTimeout(2000)

    // 警告メッセージが表示されることを確認
    const warningText = await page.locator('text=Location "104" is not connected').count()
    expect(warningText).toBe(1)

    // スクリーンショット
    await page.screenshot({ path: 'validation-isolated-location.png', fullPage: true })
  })
})