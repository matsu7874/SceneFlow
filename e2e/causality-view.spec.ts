import { test, expect } from '@playwright/test'

test.describe('因果関係ビュー', () => {
  test.beforeEach(async ({ page }) => {
    // シミュレーションページに移動
    await page.goto('/simulation')
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
    await page.getByRole('link', { name: '因果関係ビュー' }).click()
    await expect(page).toHaveURL(/\/causality/)

    // ページタイトル
    await expect(page.locator('h2')).toContainText('因果関係ビュー')

    // SVG の依存グラフが表示される
    await expect(page.locator('svg').first()).toBeVisible()

    // 凡例が表示される
    await expect(page.getByTestId('causality-legend')).toBeVisible()
  })

  test('行動ノードが表示される', async ({ page }) => {
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // 行動（act）ノードは acts の数だけ描画される（data-testid="node-act-<id>"）
    await expect(page.locator('[data-testid^="node-act-"]')).toHaveCount(5)
    await expect(page.getByTestId('node-act-1')).toBeVisible()
  })

  test('ノードをクリックすると選択状態になる', async ({ page }) => {
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    const node = page.getByTestId('node-act-1')
    await node.click()
    await expect(node).toHaveAttribute('data-selected', 'true')
  })

  test('データがない場合はメッセージが表示される', async ({ browser }) => {
    // localStorage を共有しない新しいコンテキストで開く（データ未ロード状態）
    const ctx = await browser.newContext()
    const newPage = await ctx.newPage()
    await newPage.goto('/causality')

    await expect(newPage.getByText('物語データが読み込まれていません')).toBeVisible()

    await ctx.close()
  })
})
