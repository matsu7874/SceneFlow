import { test, expect, type Page, type Locator } from '@playwright/test'

// テストデータ（人物2・場所2・小道具1・情報1 = エンティティ6件）
const testStoryData = {
  persons: [
    { id: 1, name: 'アリス', color: '#FF6B6B' },
    { id: 2, name: 'ボブ', color: '#4ECDC4' },
  ],
  locations: [
    { id: 1, name: 'リビングルーム', connections: [2] },
    { id: 2, name: 'キッチン', connections: [1] },
  ],
  props: [{ id: 1, name: '金の鍵' }],
  informations: [{ id: 1, content: '宝物は地下室に隠されている' }],
  acts: [],
  initialStates: [],
}

/**
 * 編集フォームのフィールド入力要素を、ラベル文言から取得する。
 * 現行の EntityEditor は label と input を for/id で関連付けていないため、
 * getByLabel ではなくラベル行（fieldRow）内の入力要素を辿る。
 */
function field(page: Page, label: string): Locator {
  return page
    .locator(`label:has-text("${label}")`)
    .first()
    .locator('..')
    .locator('input, textarea, select')
    .first()
}

test.describe('エンティティ編集機能', () => {
  test.beforeEach(async ({ page }) => {
    // データ読み込みのためシミュレーションページを開く
    await page.goto('/simulation')
    await expect(page).toHaveURL(/\/simulation/)

    // テストデータを読み込む
    await page
      .locator('textarea')
      .first()
      .fill(JSON.stringify(testStoryData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()

    // エンティティ編集ページに移動
    await page.getByRole('link', { name: 'エンティティ編集' }).click()
    await expect(page).toHaveURL(/\/entities/)
    await expect(page.locator('h2:has-text("エンティティ管理")')).toBeVisible()
  })

  test('エンティティ一覧が正しく表示される', async ({ page }) => {
    // エンティティ数を確認
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (6)' })).toBeVisible()

    // 各エンティティタイプが表示されることを確認
    await expect(page.locator('.entity-group-title:has-text("人物 (2)")')).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("場所 (2)")')).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("小道具 (1)")')).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("情報 (1)")')).toBeVisible()

    // 具体的なエンティティが表示されることを確認
    await expect(page.locator('.entity-item:has-text("アリス")')).toBeVisible()
    await expect(page.locator('.entity-item:has-text("ボブ")')).toBeVisible()
    await expect(page.locator('.entity-item:has-text("リビングルーム")')).toBeVisible()
  })

  test('検索機能が動作する', async ({ page }) => {
    // 「アリス」で検索
    await page.locator('input[placeholder="エンティティを検索..."]').fill('アリス')

    // アリスのみ表示されることを確認
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (1)' })).toBeVisible()
    await expect(page.locator('.entity-item:has-text("アリス")')).toBeVisible()
    await expect(page.locator('.entity-item:has-text("ボブ")')).not.toBeVisible()

    // 検索をクリア
    await page.locator('input[placeholder="エンティティを検索..."]').clear()
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (6)' })).toBeVisible()
  })

  test('タイプフィルターが動作する', async ({ page }) => {
    // 人物でフィルター
    await page.locator('select.type-filter').selectOption('person')

    // 人物のみ表示されることを確認
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (2)' })).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("人物 (2)")')).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("場所")')).not.toBeVisible()

    // 場所でフィルター
    await page.locator('select.type-filter').selectOption('location')
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (2)' })).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("場所 (2)")')).toBeVisible()
  })

  test('新しい人物エンティティを作成できる', async ({ page }) => {
    // 新規作成ボタンをクリック
    await page.getByRole('button', { name: '+ 新規作成' }).click()

    // モーダルが表示されることを確認
    await expect(page.locator('h3:has-text("新規エンティティ作成")')).toBeVisible()
    await expect(
      page.locator('p:has-text("作成するエンティティのタイプを選択してください")'),
    ).toBeVisible()

    // 人物を選択
    await page.locator('.type-button:has-text("人物")').click()

    // 新規人物の編集画面が表示される（既定名は「新規人物」）
    await expect(page.locator('h3:has-text("人物を編集: 新規人物")')).toBeVisible()

    // エンティティ数が増えたことを確認
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (7)' })).toBeVisible()

    // 編集フォームに値を入力
    await field(page, '名前').fill('太郎')
    await field(page, '説明').fill('主人公の友人')
    await field(page, '年齢').fill('25')
    await field(page, '職業').fill('エンジニア')

    // 保存
    await page.getByRole('button', { name: '保存' }).click()

    // 成功通知を確認
    await expect(page.locator('text=人物を保存しました')).toBeVisible()

    // リストに新しいエンティティが表示されることを確認
    await expect(page.locator('.entity-item:has-text("太郎")')).toBeVisible()
  })

  test('既存エンティティを編集できる', async ({ page }) => {
    // アリスをクリック
    await page.locator('.entity-item:has-text("アリス")').click()

    // 編集画面が表示されることを確認
    await expect(page.locator('h3:has-text("人物を編集: アリス")')).toBeVisible()

    // 名前を変更
    await field(page, '名前').fill('アリス・スミス')

    // 説明を追加
    await field(page, '説明').fill('物語の主人公')

    // 保存
    await page.getByRole('button', { name: '保存' }).click()

    // 成功通知を確認
    await expect(page.locator('text=人物を保存しました')).toBeVisible()

    // リストで名前が更新されていることを確認
    await expect(page.locator('.entity-item:has-text("アリス・スミス")')).toBeVisible()
  })

  test('エンティティを削除できる', async ({ page }) => {
    // ボブをクリック
    await page.locator('.entity-item:has-text("ボブ")').click()

    // 編集画面が表示されることを確認
    await expect(page.locator('h3:has-text("人物を編集: ボブ")')).toBeVisible()

    // 削除前のエンティティ数を確認
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (6)' })).toBeVisible()

    // 削除ボタンをクリック（確認ダイアログを自動承認）
    page.on('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: '削除' }).click()

    // 削除通知を確認
    await expect(page.locator('text=人物を削除しました')).toBeVisible()

    // エンティティがリストから削除されたことを確認
    await expect(page.locator('.entity-item:has-text("ボブ")')).not.toBeVisible()
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (5)' })).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("人物 (1)")')).toBeVisible()
  })

  test('複雑なフィールドタイプ（select/number）を扱える', async ({ page }) => {
    // 新しい場所を作成
    await page.getByRole('button', { name: '+ 新規作成' }).click()
    await page.locator('.type-button:has-text("場所")').click()

    // 基本情報を入力（タイプ=select, 収容人数=number）
    await field(page, '名前').fill('地下室')
    await field(page, '説明').fill('暗くて神秘的な地下室')
    await field(page, 'タイプ').selectOption('indoor')
    await field(page, '収容人数').fill('10')

    // 保存
    await page.getByRole('button', { name: '保存' }).click()

    // 成功通知を確認（情報の content にも「地下室」が含まれるため場所名は厳密一致で確認）
    await expect(page.locator('text=場所を保存しました')).toBeVisible()
    await expect(page.locator('.entity-name').getByText('地下室', { exact: true })).toBeVisible()
  })

  test('配列フィールド（目標）を操作できる', async ({ page }) => {
    // アリスを選択
    await page.locator('.entity-item:has-text("アリス")').click()
    await expect(page.locator('h3:has-text("人物を編集: アリス")')).toBeVisible()

    // 目標フィールドに項目を追加
    const goalsRow = page.locator('label:has-text("目標")').first().locator('..')
    await goalsRow.getByRole('button', { name: '+ 項目を追加' }).click()
    await goalsRow.locator('input, textarea').first().fill('宝物を見つける')

    // 保存
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.locator('text=人物を保存しました')).toBeVisible()
  })

  test('モーダルの閉じる操作ができる', async ({ page }) => {
    // モーダルを開く
    await page.getByRole('button', { name: '+ 新規作成' }).click()
    await expect(page.locator('h3:has-text("新規エンティティ作成")')).toBeVisible()

    // キャンセルボタンで閉じる
    await page.getByRole('button', { name: 'キャンセル' }).click()
    await expect(page.locator('h3:has-text("新規エンティティ作成")')).not.toBeVisible()

    // 再度開いてオーバーレイクリックで閉じる
    await page.getByRole('button', { name: '+ 新規作成' }).click()
    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('h3:has-text("新規エンティティ作成")')).not.toBeVisible()
  })
})
