import { test, expect } from '@playwright/test'

test.describe('因果関係ビューデバッグ', () => {
  test('コンソールエラーを確認', async ({ page }) => {
    const consoleErrors: string[] = []

    // コンソールエラーをキャプチャ
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // シミュレーションページに移動
    await page.goto('http://localhost:3000/simulation')

    // テストデータを作成
    const testData = {
      persons: [
        { id: 1, name: '桃太郎', color: '#FF0000' },
      ],
      locations: [
        { id: 1, name: '家', connections: [] },
      ],
      acts: [
        { id: 1, personId: 1, locationId: 1, time: '00:00:00', description: '桃から生まれる' },
      ],
      props: [],
      informations: [],
      initialStates: [
        { personId: 1, locationId: 1, time: '00:00:00' },
      ],
    }

    // データをロード
    const textarea = page.locator('textarea').first()
    await textarea.fill(JSON.stringify(testData, null, 2))

    const loadButton = page.getByRole('button', { name: '物語データをロード' })
    await loadButton.click()

    // ロード成功を待つ
    await page.locator('text=データが正常にロードされました').waitFor({ timeout: 5000 })

    // 因果関係ビューに移動前のURL
    console.log('URL before navigation:', page.url())

    // ナビゲーションリンクの存在確認
    const links = await page.getByRole('link').all()
    console.log('Available links:', await Promise.all(links.map(link => link.textContent())))

    // 因果関係ビューに移動
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // 少し待つ
    await page.waitForTimeout(2000)

    // 移動後のURL
    console.log('URL after navigation:', page.url())

    // コンソールエラーを出力
    if (consoleErrors.length > 0) {
      console.log('Console errors found:')
      consoleErrors.forEach(err => console.log(err))
    }

    // ページのHTMLを取得
    const html = await page.content()
    console.log('Page HTML:', html.substring(0, 1000))

    // スクリーンショットを撮る
    await page.screenshot({ path: 'debug-causality-view.png' })

    // テストは常に成功させる（デバッグ目的）
    expect(true).toBe(true)
  })
})