import { test, expect } from '@playwright/test'

// 包括的なテストデータ
const comprehensiveTestData = {
  persons: [
    { id: 1, name: '太郎', color: '#FF0000' },
    { id: 2, name: '花子', color: '#00FF00' },
    { id: 3, name: '次郎', color: '#0000FF' },
  ],
  locations: [
    { id: 1, name: '広場', connections: [2, 3] },
    { id: 2, name: '図書館', connections: [1, 3] },
    { id: 3, name: 'カフェ', connections: [1, 2] },
  ],
  props: [
    { id: 1, name: '本', type: 'prop' },
    { id: 2, name: '鍵', type: 'prop' },
    { id: 3, name: 'テーブル', type: 'set' },
  ],
  informations: [
    { id: 1, name: '秘密のメッセージ' },
    { id: 2, name: '図書館の開館時間' },
  ],
  initialStates: [
    { personId: 1, locationId: 1, time: '09:00', props: [1] },
    { personId: 2, locationId: 2, time: '09:00', props: [2] },
    { personId: 3, locationId: 3, time: '09:00' },
  ],
  acts: [
    {
      id: 1,
      type: 'move',
      personId: 1,
      fromLocationId: 1,
      toLocationId: 2,
      startTime: '09:00',
      endTime: '09:15',
    },
    {
      id: 2,
      type: 'speak',
      personId: 2,
      locationId: 2,
      content: 'こんにちは',
      time: '09:15',
    },
    {
      id: 3,
      type: 'give',
      giverId: 2,
      receiverId: 1,
      propId: 2,
      locationId: 2,
      time: '09:20',
    },
  ],
}

test.describe('Scene Flow コア機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001')
    await expect(page).toHaveTitle(/Scene-Flow/)
  })

  test('1. サンプルストーリーデータの読み込み', async ({ page }) => {
    // シミュレーションページに移動
    await page.getByRole('link', { name: 'シミュレーション' }).click()
    await expect(page).toHaveURL(/\/simulation/)

    // JSONデータを入力
    const textarea = page.locator('textarea')
    await textarea.fill(JSON.stringify(comprehensiveTestData, null, 2))

    // データをロード
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // ロード成功の確認
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()

    // データが正しく読み込まれたか確認
    await expect(page.locator('text=太郎')).toBeVisible()
    await expect(page.locator('text=花子')).toBeVisible()
    await expect(page.locator('text=次郎')).toBeVisible()
  })

  test('2. マップエディタ機能のテスト', async ({ page }) => {
    // データを読み込む
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(comprehensiveTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // マップエディタに移動
    await page.getByRole('link', { name: 'マップエディタ' }).click()
    await expect(page).toHaveURL(/\/map-editor/)

    // 操作ガイドを閉じる
    await page.locator('.guide-header').click()
    await page.waitForTimeout(300)

    // 初期状態の確認
    await expect(page.locator('text=ノード数: 3')).toBeVisible()
    await expect(page.locator('text=接続数: 6')).toBeVisible()

    // ノードを追加
    await page.getByRole('button', { name: 'ノード追加' }).click()
    await expect(page.locator('text=ノード数: 4')).toBeVisible()

    // 接続モードのテスト
    await page.getByRole('button', { name: '接続モード' }).click()

    // キャンバス上でノードをクリックして接続を作成
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 100, y: 100 } })
    await canvas.click({ position: { x: 200, y: 200 } })

    // 元に戻す
    await page.getByRole('button', { name: '元に戻す' }).click()
    await expect(page.locator('text=ノード数: 3')).toBeVisible()

    // やり直し
    await page.getByRole('button', { name: 'やり直し' }).click()
    await expect(page.locator('text=ノード数: 4')).toBeVisible()

    // 保存
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.locator('text=マップデータを保存しました')).toBeVisible()
  })

  test('3. エンティティエディタ機能のテスト', async ({ page }) => {
    // データを読み込む
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(comprehensiveTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // エンティティページに移動
    await page.getByRole('link', { name: 'エンティティ' }).click()
    await expect(page).toHaveURL(/\/entities/)

    // キャラクタータブの確認
    await expect(page.locator('text=太郎')).toBeVisible()
    await expect(page.locator('text=花子')).toBeVisible()

    // 新しいキャラクターを追加
    await page.getByRole('button', { name: '新規キャラクター' }).click()
    await page.locator('input[placeholder="名前"]').fill('三郎')
    await page.locator('input[type="color"]').fill('#FFFF00')
    await page.getByRole('button', { name: '追加' }).click()
    await expect(page.locator('text=三郎')).toBeVisible()

    // ロケーションタブに切り替え
    await page.getByRole('tab', { name: 'ロケーション' }).click()
    await expect(page.locator('text=広場')).toBeVisible()
    await expect(page.locator('text=図書館')).toBeVisible()

    // 新しいロケーションを追加
    await page.getByRole('button', { name: '新規ロケーション' }).click()
    await page.locator('input[placeholder="名前"]').fill('公園')
    await page.getByRole('button', { name: '追加' }).click()
    await expect(page.locator('text=公園')).toBeVisible()

    // アイテムタブに切り替え
    await page.getByRole('tab', { name: 'アイテム' }).click()
    await expect(page.locator('text=本')).toBeVisible()
    await expect(page.locator('text=鍵')).toBeVisible()

    // 新しいアイテムを追加
    await page.getByRole('button', { name: '新規アイテム' }).click()
    await page.locator('input[placeholder="名前"]').fill('手紙')
    await page.locator('select').selectOption('prop')
    await page.getByRole('button', { name: '追加' }).click()
    await expect(page.locator('text=手紙')).toBeVisible()
  })

  test('4. シミュレーション制御のテスト', async ({ page }) => {
    // データを読み込む
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(comprehensiveTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // シミュレーション開始
    await page.getByRole('button', { name: '開始' }).click()
    await page.waitForTimeout(1000)

    // 時間が進んでいることを確認
    const timeDisplay = page.locator('.time-display')
    const initialTime = await timeDisplay.textContent()
    await page.waitForTimeout(2000)
    const updatedTime = await timeDisplay.textContent()
    expect(initialTime).not.toBe(updatedTime)

    // 一時停止
    await page.getByRole('button', { name: '一時停止' }).click()
    const pausedTime = await timeDisplay.textContent()
    await page.waitForTimeout(1000)
    const stillPausedTime = await timeDisplay.textContent()
    expect(pausedTime).toBe(stillPausedTime)

    // リセット
    await page.getByRole('button', { name: 'リセット' }).click()
    await expect(timeDisplay).toContainText('09:00')

    // イベントログの確認
    const eventLog = page.locator('.event-log')
    await expect(eventLog).toBeVisible()

    // シミュレーションを再開して移動イベントを確認
    await page.getByRole('button', { name: '開始' }).click()
    await page.waitForTimeout(3000)
    await expect(eventLog).toContainText('太郎')
    await expect(eventLog).toContainText('移動')
  })

  test('5. エラーハンドリングとバリデーション', async ({ page }) => {
    // シミュレーションページに移動
    await page.goto('/simulation')

    // 無効なJSONを入力
    await page.locator('textarea').fill('{ invalid json }')
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // エラーメッセージの確認
    await expect(page.locator('text=JSONの解析に失敗しました')).toBeVisible()

    // 不完全なデータを入力
    const incompleteData = {
      persons: [{ id: 1 }], // nameがない
      locations: [],
    }
    await page.locator('textarea').fill(JSON.stringify(incompleteData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // バリデーションエラーの確認
    await expect(page.locator('text=データの検証に失敗しました')).toBeVisible()
  })

  test('6. 因果関係ビューのテスト', async ({ page }) => {
    // データを読み込む
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(comprehensiveTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // 因果関係ページに移動
    await page.getByRole('link', { name: '因果関係' }).click()
    await expect(page).toHaveURL(/\/causality/)

    // 因果関係ビューが表示されることを確認
    await expect(page.locator('h2')).toContainText('因果関係ビュー')

    // Actノードが表示されることを確認
    await expect(page.locator('text=移動: 太郎')).toBeVisible()
    await expect(page.locator('text=発言: 花子')).toBeVisible()
    await expect(page.locator('text=アイテム受け渡し')).toBeVisible()
  })

  test('7. データのエクスポート機能', async ({ page }) => {
    // データを読み込む
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(comprehensiveTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // エクスポートボタンをクリック
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'エクスポート' }).click()
    const download = await downloadPromise

    // ダウンロードファイルの確認
    expect(download.suggestedFilename()).toContain('scene-flow-data')
    expect(download.suggestedFilename()).toContain('.json')
  })
})

test.describe('パフォーマンスとエラー処理', () => {
  test('大量データでのパフォーマンス', async ({ page }) => {
    // 大量のデータを生成
    const largeData = {
      persons: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `キャラクター${i + 1}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      })),
      locations: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `場所${i + 1}`,
        connections: [(i + 2) % 20 + 1],
      })),
      props: [],
      informations: [],
      initialStates: Array.from({ length: 50 }, (_, i) => ({
        personId: i + 1,
        locationId: (i % 20) + 1,
        time: '09:00',
      })),
      acts: [],
      moves: [],
      stays: [],
      events: [],
    }

    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(largeData, null, 2))

    // ロード時間を計測
    const startTime = Date.now()
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()
    const loadTime = Date.now() - startTime

    // 5秒以内にロードされることを確認
    expect(loadTime).toBeLessThan(5000)
  })

  test('ネットワークエラーのハンドリング', async ({ page, context }) => {
    // オフライン状態をシミュレート
    await context.route('**/*', route => route.abort())

    await page.goto('http://localhost:3001').catch(() => {})

    // エラーページまたはフォールバックが表示されることを確認
    await expect(page.locator('body')).toContainText(/エラー|接続できません|offline/i)
  })
})