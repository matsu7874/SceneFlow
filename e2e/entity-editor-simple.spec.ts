import { test, expect } from '@playwright/test'

// シンプルなテストデータ
const simpleTestData = {
  persons: [
    { id: 1, name: 'テスト太郎', color: '#FF0000' },
    { id: 2, name: 'テスト花子', color: '#00FF00' },
  ],
  locations: [{ id: 1, name: 'テストルーム', connections: [] }],
  props: [],
  informations: [],
  initialStates: [
    { personId: 1, locationId: 1, time: '09:00' },
    { personId: 2, locationId: 1, time: '09:00' },
  ],
  acts: [{ id: 1, personId: 1, locationId: 1, time: '09:00', description: 'テスト行動' }],
}

test.describe('エンティティ編集の基本動作確認', () => {
  test('データ読み込みなしでエンティティページを表示', async ({ page }) => {
    // 直接エンティティページにアクセス
    await page.goto('/entities')

    // ページタイトルを確認
    await expect(page.locator('h2')).toContainText('エンティティ管理')

    // データなしメッセージを確認
    await expect(page.locator('text=データが読み込まれていません')).toBeVisible()
    await expect(
      page.locator('text=シミュレーションページで物語データを読み込んでください'),
    ).toBeVisible()
  })

  test('データを読み込んでエンティティ一覧を表示', async ({ page }) => {
    // コンソールエラーを監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('ページエラー:', msg.text())
      }
    })

    // Step 1: シミュレーションページでデータを読み込む
    await page.goto('/simulation')

    // データ入力欄を待つ
    await page.waitForSelector('textarea', { timeout: 5000 })

    // データを入力
    await page.locator('textarea').fill(JSON.stringify(simpleTestData, null, 2))

    // デバッグ用スクリーンショット
    await page.screenshot({ path: 'debug-before-load.png' })

    // 読み込みボタンをクリック
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // 少し待つ
    await page.waitForTimeout(500)

    // デバッグ用スクリーンショット
    await page.screenshot({ path: 'debug-after-load-click.png' })

    // エラーメッセージが表示されていないか確認
    const errorElement = page.locator('.error-output')
    const hasError = await errorElement.isVisible()
    if (hasError) {
      const errorText = await errorElement.textContent()
      console.error('バリデーションエラー:', errorText)
    }

    // データが読み込まれたことを確認（シミュレーション制御が表示される）
    await expect(page.locator('text=シミュレーション制御')).toBeVisible({ timeout: 10000 })

    // Step 2: エンティティページに移動
    await page.getByRole('link', { name: 'エンティティ編集' }).click()

    // ページが読み込まれるのを待つ
    await expect(page).toHaveURL(/\/entities/)
    await expect(page.locator('h2')).toContainText('エンティティ管理')

    // エンティティが表示されることを確認
    await expect(page.locator('.entity-item').first()).toBeVisible({ timeout: 5000 })

    // 具体的なエンティティを確認
    await expect(page.locator('text=テスト太郎')).toBeVisible()
    await expect(page.locator('text=テスト花子')).toBeVisible()
    await expect(page.locator('text=テストルーム')).toBeVisible()
  })

  test('エンティティをクリックして編集画面を表示', async ({ page }) => {
    // データを読み込んだ状態でエンティティページへ
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(simpleTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('link', { name: 'エンティティ編集' }).click()

    // エンティティをクリック
    await page.locator('.entity-item:has-text("テスト太郎")').click()

    // 編集画面が表示されることを確認
    await expect(page.locator('h3').filter({ hasText: 'テスト太郎' })).toBeVisible({
      timeout: 5000,
    })

    // 基本的なフィールドが表示されることを確認
    // ラベルが表示されることを確認
    await expect(page.locator('label:has-text("名前")')).toBeVisible()
    // 名前フィールドの値を確認（ラベルの次の入力フィールドを探す）
    const nameInput = page
      .locator('label:has-text("名前")')
      .locator('..')
      .locator('input[type="text"]')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('テスト太郎')
  })

  test('新規作成モーダルを開いて閉じる', async ({ page }) => {
    // データを読み込んだ状態でエンティティページへ
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(simpleTestData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('link', { name: 'エンティティ編集' }).click()

    // 新規作成ボタンをクリック
    await page.getByRole('button', { name: '+ 新規作成' }).click()

    // モーダルが表示されることを確認
    await expect(page.locator('h3:has-text("新規エンティティ作成")')).toBeVisible()

    // キャンセルボタンで閉じる
    await page.getByRole('button', { name: 'キャンセル' }).click()

    // モーダルが閉じることを確認
    await expect(page.locator('h3:has-text("新規エンティティ作成")')).not.toBeVisible()
  })
})
