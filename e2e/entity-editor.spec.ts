import { test, expect } from '@playwright/test'

// テストデータ
const testStoryData = {
  persons: [
    { id: 'alice', name: 'アリス' },
    { id: 'bob', name: 'ボブ' },
  ],
  locations: [
    { id: 'room1', name: 'リビングルーム', connectedTo: ['room2'] },
    { id: 'room2', name: 'キッチン', connectedTo: ['room1'] },
  ],
  props: [{ id: 'key1', name: '金の鍵' }],
  informations: [{ id: 'info1', content: '宝物は地下室に隠されている' }],
  acts: [{ id: 'act1', type: 'move', personId: 'alice', locationId: 'room1' }],
  events: [{ id: 'event1', trigger: { type: 'time', time: 300 } }],
  relationships: [],
  connections: [],
}

test.describe('エンティティ編集機能', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('/')

    // シミュレーションページにリダイレクトされるのを待つ
    await expect(page).toHaveURL(/\/simulation/)

    // テストデータを読み込む
    await page
      .locator('textarea')
      .first()
      .fill(JSON.stringify(testStoryData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // データが読み込まれるのを待つ
    await page.waitForTimeout(1000)

    // エンティティ編集ページに移動
    await page.getByRole('link', { name: 'エンティティ編集' }).click()
    await expect(page).toHaveURL(/\/entities/)

    // ページが読み込まれるのを待つ
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
    await page.locator('select').selectOption('person')

    // 人物のみ表示されることを確認
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (2)' })).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("人物 (2)")')).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("場所")')).not.toBeVisible()

    // 場所でフィルター
    await page.locator('select').selectOption('location')
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

    // 新しいエンティティが作成され、編集画面が表示されることを確認
    await expect(page.locator('h3:has-text("person")')).toBeVisible()
    await expect(page.locator('h3:has-text("新規人物")')).toBeVisible()

    // エンティティ数が増えたことを確認
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (7)' })).toBeVisible()

    // 編集フォームに値を入力
    await page.getByLabel('名前').clear()
    await page.getByLabel('名前').fill('太郎')
    await page.getByLabel('説明').fill('主人公の友人')
    await page.getByLabel('年齢').fill('25')
    await page.getByLabel('職業').fill('エンジニア')

    // 保存
    await page.getByRole('button', { name: '保存' }).click()

    // 成功通知を確認
    await expect(page.locator('text=personを保存しました')).toBeVisible()

    // リストに新しいエンティティが表示されることを確認
    await expect(page.locator('.entity-item:has-text("太郎")')).toBeVisible()
  })

  test('既存エンティティを編集できる', async ({ page }) => {
    // アリスをクリック
    await page.locator('.entity-item:has-text("アリス")').click()

    // 編集画面が表示されることを確認
    await expect(page.locator('h3:has-text("personを編集: アリス")')).toBeVisible()

    // 名前を変更
    await page.getByLabel('名前').clear()
    await page.getByLabel('名前').fill('アリス・スミス')

    // 説明を追加
    await page.getByLabel('説明').fill('物語の主人公')

    // 保存
    await page.getByRole('button', { name: '保存' }).click()

    // 成功通知を確認
    await expect(page.locator('text=personを保存しました')).toBeVisible()

    // リストで名前が更新されていることを確認
    await expect(page.locator('.entity-item:has-text("アリス・スミス")')).toBeVisible()
    await expect(page.locator('.entity-item:has-text("アリス")').first()).not.toBeVisible()
  })

  test('エンティティを削除できる', async ({ page }) => {
    // ボブをクリック
    await page.locator('.entity-item:has-text("ボブ")').click()

    // 編集画面が表示されることを確認
    await expect(page.locator('h3:has-text("personを編集: ボブ")')).toBeVisible()

    // 削除前のエンティティ数を確認
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (6)' })).toBeVisible()

    // 削除ボタンをクリック
    page.on('dialog', dialog => dialog.accept()) // 確認ダイアログを自動的に承認
    await page.getByRole('button', { name: '削除' }).click()

    // 削除通知を確認
    await expect(page.locator('text=personを削除しました')).toBeVisible()

    // エンティティがリストから削除されたことを確認
    await expect(page.locator('.entity-item:has-text("ボブ")')).not.toBeVisible()
    await expect(page.locator('h3').filter({ hasText: 'エンティティ (5)' })).toBeVisible()
    await expect(page.locator('.entity-group-title:has-text("人物 (1)")')).toBeVisible()
  })

  test('複雑なフィールドタイプを扱える', async ({ page }) => {
    // 新しい場所を作成
    await page.getByRole('button', { name: '+ 新規作成' }).click()
    await page.locator('.type-button:has-text("場所")').click()

    // 基本情報を入力
    await page.getByLabel('名前').clear()
    await page.getByLabel('名前').fill('地下室')
    await page.getByLabel('説明').fill('暗くて神秘的な地下室')
    await page.getByLabel('タイプ').selectOption('indoor')
    await page.getByLabel('収容人数').fill('10')

    // 接続セクションを展開
    await page.locator('text=接続').click()

    // 接続された場所を追加
    await page.locator('button:has-text("アイテムを追加")').first().click()
    await page.waitForTimeout(500) // 動的要素の表示を待つ

    // 保存
    await page.getByRole('button', { name: '保存' }).click()

    // 成功通知を確認
    await expect(page.locator('text=locationを保存しました')).toBeVisible()
    await expect(page.locator('.entity-item:has-text("地下室")')).toBeVisible()
  })

  test('必須フィールドのバリデーションが動作する', async ({ page }) => {
    // 新しい人物を作成
    await page.getByRole('button', { name: '+ 新規作成' }).click()
    await page.locator('.type-button:has-text("人物")').click()

    // 名前を空にする（必須フィールド）
    await page.getByLabel('名前').clear()

    // 保存を試みる
    await page.getByRole('button', { name: '保存' }).click()

    // エラーメッセージを確認
    await expect(page.locator('text=検証エラーを修正してください')).toBeVisible()
    await expect(page.locator('text=このフィールドは必須です')).toBeVisible()
  })

  test('配列フィールドの操作ができる', async ({ page }) => {
    // アリスを選択
    await page.locator('.entity-item:has-text("アリス")').click()

    // キャラクターセクションを展開
    await page.locator('text=キャラクター').click()

    // 目標を追加
    const goalsSection = page.locator('text=目標').locator('..')
    await goalsSection.getByRole('button', { name: 'アイテムを追加' }).click()
    await page.locator('input[placeholder*="目標[0]"]').fill('宝物を見つける')

    await goalsSection.getByRole('button', { name: 'アイテムを追加' }).click()
    await page.locator('input[placeholder*="目標[1]"]').fill('王国を救う')

    // 保存
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.locator('text=personを保存しました')).toBeVisible()
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
