import { test, expect } from '@playwright/test'

test.describe('因果関係ビューコンソールログ確認', () => {
  test('コンソールログを収集', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = []

    // すべてのコンソールメッセージをキャプチャ
    page.on('console', (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
      })
    })

    // シミュレーションページに移動
    await page.goto('http://localhost:3000/simulation')
    await page.waitForLoadState('networkidle')

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

    // コンソールログをクリア
    consoleLogs.length = 0

    // 因果関係ビューに移動
    await page.getByRole('link', { name: '因果関係ビュー' }).click()

    // ページロードを待つ
    await page.waitForTimeout(3000)

    // コンソールログを出力
    console.log('\n=== Console Logs ===')
    consoleLogs.forEach((log, index) => {
      console.log(`[${index}] ${log.type}: ${log.text}`)
    })
    console.log('===================\n')

    // ページの状態を確認
    const pageContent = await page.content()
    const hasH2 = pageContent.includes('<h2>')
    const hasCanvas = pageContent.includes('<canvas')
    const hasSvg = pageContent.includes('<svg')

    console.log('Page has H2:', hasH2)
    console.log('Page has Canvas:', hasCanvas)
    console.log('Page has SVG:', hasSvg)

    // ボディのHTMLを取得（最初の1000文字）
    const bodyHtml = await page.locator('body').innerHTML()
    console.log('Body HTML (first 1000 chars):', bodyHtml.substring(0, 1000))

    // スクリーンショット
    await page.screenshot({ path: 'debug-causality-logs.png', fullPage: true })

    expect(true).toBe(true)
  })
})