import { test, expect } from '@playwright/test'

// 基本的なテストデータ
const simpleTestData = {
  persons: [
    { id: 1, name: '太郎', color: '#FF0000' },
    { id: 2, name: '花子', color: '#00FF00' },
  ],
  locations: [
    { id: 1, name: '広場', connections: [2] },
    { id: 2, name: '図書館', connections: [1] },
  ],
  props: [],
  informations: [],
  initialStates: [
    { personId: 1, locationId: 1, time: '09:00' },
    { personId: 2, locationId: 2, time: '09:00' },
  ],
  acts: [],
}

test.describe('Scene Flow 基本機能確認', () => {
  test('アプリケーションが起動し、基本的なナビゲーションが動作する', async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('http://localhost:3000')

    // タイトルの確認
    await expect(page).toHaveTitle(/Scene-Flow/)

    // メインヘッダーの確認
    await expect(page.locator('.app-header h1').first()).toContainText('Scene-Flow')

    // ナビゲーションリンクの確認
    await expect(page.getByRole('link', { name: 'シミュレーション' })).toBeVisible()
    await expect(page.getByRole('link', { name: '因果関係ビュー' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'エンティティ編集' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'マップエディタ' })).toBeVisible()
    await expect(page.getByRole('link', { name: '関係性' })).toBeVisible()
    await expect(page.getByRole('link', { name: '検証' })).toBeVisible()

    // デフォルトでシミュレーションページが表示されることを確認
    await expect(page).toHaveURL(/\/simulation/)
    await expect(page.locator('h2').first()).toContainText('Simulation')
  })

  test('データのロードと通知が正しく動作する', async ({ page }) => {
    await page.goto('http://localhost:3000/simulation')

    // JSONデータ入力エリアの確認
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.getByRole('button', { name: '物語データをロード' })).toBeVisible()

    // テストデータを入力
    await page.locator('textarea').fill(JSON.stringify(simpleTestData, null, 2))

    // データをロード
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // 成功通知の確認
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()

    // データが表示されることを確認（LocationDisplayコンポーネント内）
    await expect(page.locator('.person-tag').filter({ hasText: '太郎' })).toBeVisible()
    await expect(page.locator('.person-tag').filter({ hasText: '花子' })).toBeVisible()
  })

  test('マップエディタページへの遷移と基本表示', async ({ page }) => {
    // データをロード
    await page.goto('http://localhost:3000/simulation')
    await page.locator('textarea').fill(JSON.stringify(simpleTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // マップエディタへ移動
    await page.getByRole('link', { name: 'マップエディタ' }).click()
    await expect(page).toHaveURL(/\/map-editor/)
    await expect(page.locator('h2')).toContainText('マップエディタ')

    // キャンバスが表示されることを確認
    await expect(page.locator('canvas').first()).toBeVisible()

    // 操作ガイドを閉じる
    const guideHeader = page.locator('.guide-header')
    if (await guideHeader.isVisible()) {
      await guideHeader.click()
      await page.waitForTimeout(300)
    }

    // ノード数の確認
    await expect(page.locator('text=ノード数: 2')).toBeVisible()
  })

  test('エンティティエディタでの基本操作', async ({ page }) => {
    // データをロード
    await page.goto('http://localhost:3000/simulation')
    await page.locator('textarea').fill(JSON.stringify(simpleTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // エンティティページへ移動
    await page.getByRole('link', { name: 'エンティティ編集' }).click()
    await expect(page).toHaveURL(/\/entities/)

    // エンティティグループが表示されることを確認
    await expect(page.locator('.entity-group-title').filter({ hasText: '人物' })).toBeVisible()
    await expect(page.locator('.entity-group-title').filter({ hasText: '場所' })).toBeVisible()

    // キャラクターが表示されることを確認
    await expect(page.locator('.entity-name').filter({ hasText: '太郎' })).toBeVisible()
    await expect(page.locator('.entity-name').filter({ hasText: '花子' })).toBeVisible()

    // タイプフィルターの確認
    const typeFilter = page.locator('select.type-filter')
    await expect(typeFilter).toBeVisible()

    // セレクトボックスのオプションが存在することを確認（値で確認）
    await expect(typeFilter).toHaveValue('all')  // デフォルト値
    await typeFilter.selectOption('person')
    await expect(typeFilter).toHaveValue('person')
    await typeFilter.selectOption('location')
    await expect(typeFilter).toHaveValue('location')
  })

  test('シミュレーション制御の基本動作', async ({ page }) => {
    // データをロード
    await page.goto('http://localhost:3000/simulation')
    await page.locator('textarea').fill(JSON.stringify(simpleTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // シミュレーション制御の確認
    const playButton = page.getByRole('button', { name: /Play/i })
    const pauseButton = page.getByRole('button', { name: /Pause/i })

    await expect(playButton).toBeVisible()

    // 時間表示の確認
    const timeDisplay = page.locator('.current-time-display')
    await expect(timeDisplay).toContainText('00:00')

    // シミュレーション開始
    await playButton.click()
    await expect(pauseButton).toBeVisible()

    // 一時停止
    await pauseButton.click()
    await expect(playButton).toBeVisible()

    // タイムラインスライダーで時間をリセット
    const timeline = page.locator('input[type="range"].timeline')
    await timeline.fill('0')
    await expect(timeDisplay).toContainText('00:00')
  })

  test('エラーハンドリング - 無効なJSON', async ({ page }) => {
    await page.goto('http://localhost:3000/simulation')

    // 無効なJSONを入力
    await page.locator('textarea').fill('{ invalid json }')
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // エラー通知の確認（NotificationDisplayコンポーネント内）
    await expect(page.locator('[class*="notification"]').filter({ hasText: 'JSONの解析に失敗しました' })).toBeVisible()
  })

  test('エラーハンドリング - 不完全なデータ', async ({ page }) => {
    await page.goto('http://localhost:3000/simulation')

    // 不完全なデータ（必須フィールドが欠けている）
    const incompleteData = {
      persons: [{ id: 1 }], // nameがない
      locations: [],
    }

    await page.locator('textarea').fill(JSON.stringify(incompleteData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // バリデーションエラーの確認
    await expect(page.locator('text=データの検証に失敗しました')).toBeVisible()
  })
})