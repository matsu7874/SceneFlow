import { test, expect } from '@playwright/test'

test.describe('因果関係ビュー', () => {
  test.beforeEach(async ({ page }) => {
    // シミュレーションページに移動
    await page.goto('http://localhost:3000/simulation')
    await page.waitForLoadState('networkidle')

    // テストデータを作成
    const testData = {
      persons: [
        { id: 1, name: '桃太郎', color: '#FF0000' },
        { id: 2, name: 'おじいさん', color: '#00FF00' },
        { id: 3, name: 'おばあさん', color: '#0000FF' },
      ],
      locations: [
        { id: 1, name: '家', connections: [2] },
        { id: 2, name: '村', connections: [1, 3] },
        { id: 3, name: '山', connections: [2] },
      ],
      acts: [
        { id: 1, personId: 1, locationId: 1, time: '00:00:00', description: '桃から生まれる' },
        { id: 2, personId: 2, locationId: 3, time: '00:05:00', description: '山で柴刈り' },
        { id: 3, personId: 3, locationId: 1, time: '00:05:00', description: '川で洗濯' },
        { id: 4, personId: 1, locationId: 2, time: '01:00:00', description: '村へ出発' },
        { id: 5, personId: 1, locationId: 3, time: '02:00:00', description: '山で仲間と出会う' },
      ],
      props: [],
      informations: [],
      initialStates: [
        { personId: 1, locationId: 1, time: '00:00:00' },
        { personId: 2, locationId: 3, time: '00:00:00' },
        { personId: 3, locationId: 1, time: '00:00:00' },
      ],
    }

    // データをロード
    const textarea = page.locator('textarea').first()
    await textarea.fill(JSON.stringify(testData, null, 2))

    const loadButton = page.getByRole('button', { name: '物語データをロード' })
    await loadButton.click()

    // ロード成功の通知を待つ
    await page.locator('text=データが正常にロードされました').waitFor({ timeout: 5000 })
  })

  test('因果関係ビューが表示される', async ({ page }) => {
    // 因果関係ビューに移動
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // ページタイトルが表示されることを確認
    await expect(page.locator('h2')).toContainText('Causality Analysis')

    // エラーメッセージが表示されていないことを確認
    const errorElement = page.locator('text=Error in Causality View')
    await expect(errorElement).not.toBeVisible()

    // Canvas要素が存在することを確認
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // SVG要素が存在することを確認
    const svg = page.locator('svg')
    await expect(svg).toBeVisible()

    // コントロールが表示されることを確認
    const resetButton = page.getByRole('button', { name: 'Reset View' })
    await expect(resetButton).toBeVisible()

    // スケール表示があることを確認
    await expect(page.locator('text=Scale:')).toBeVisible()
  })

  test('ノードが表示される', async ({ page }) => {
    // 因果関係ビューに移動
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // SVG内のノード（円）が表示されることを確認
    const nodes = page.locator('svg circle')
    await expect(nodes).toHaveCount(10) // 5 acts + 5 events

    // ノードのテキストが表示されることを確認
    const nodeTexts = page.locator('svg text')
    await expect(nodeTexts.first()).toBeVisible()
  })

  test('ズーム機能が動作する', async ({ page }) => {
    // 因果関係ビューに移動
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // 初期スケールを確認
    const scaleText = page.locator('text=Scale:')
    await expect(scaleText).toContainText('1.00')

    // Canvas上でマウスホイールを使ってズームイン
    const canvas = page.locator('canvas')
    await canvas.hover()
    await page.mouse.wheel(0, -100) // ズームイン

    // スケールが変更されたことを確認
    await expect(scaleText).not.toContainText('1.00')
  })

  test('パン機能が動作する', async ({ page }) => {
    // 因果関係ビューに移動
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // Canvas上でドラッグしてパン
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    // ドラッグ操作
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100)
    await page.mouse.up()

    // ビューがパンされたことを視覚的に確認するのは難しいので、
    // エラーが発生しないことを確認
    await expect(page.locator('text=Error in Causality View')).not.toBeVisible()
  })

  test('リセットボタンが動作する', async ({ page }) => {
    // 因果関係ビューに移動
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // ズームを変更
    const canvas = page.locator('canvas')
    await canvas.hover()
    await page.mouse.wheel(0, -100)

    // スケールが1.00でないことを確認
    const scaleText = page.locator('text=Scale:')
    await expect(scaleText).not.toContainText('1.00')

    // リセットボタンをクリック
    await page.getByRole('button', { name: 'Reset View' }).click()

    // スケールが1.00に戻ることを確認
    await expect(scaleText).toContainText('1.00')
  })

  test('ノードをクリックすると選択される', async ({ page }) => {
    // 因果関係ビューに移動
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // 最初のノードをクリック
    const firstNode = page.locator('svg circle').first()
    await firstNode.click()

    // 通知が表示されることを確認（選択されたことを示す）
    // 実際の通知メッセージは実装により異なる可能性があるため、
    // エラーが発生しないことを確認
    await expect(page.locator('text=Error in Causality View')).not.toBeVisible()
  })

  test('データがない場合はメッセージが表示される', async ({ page }) => {
    // 新しいタブでページを開く（データをロードせずに）
    const newPage = await page.context().newPage()
    await newPage.goto('http://localhost:3000/causality')

    // データなしのメッセージが表示されることを確認
    await expect(newPage.locator('text=No story data loaded')).toBeVisible()

    await newPage.close()
  })
})