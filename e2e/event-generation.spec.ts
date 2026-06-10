import { test, expect } from '@playwright/test'
import { loadStoryData, navTo } from './helpers'

const testDataWithoutEvents = {
  persons: [
    { id: 1, name: 'アリス', color: '#FF6B6B' },
    { id: 2, name: 'ボブ', color: '#4ECDC4' },
    { id: 3, name: 'キャロル', color: '#45B7D1' },
  ],
  locations: [
    { id: 101, name: '公園', connections: [102, 103] },
    { id: 102, name: 'カフェ', connections: [101, 103] },
    { id: 103, name: '図書館', connections: [101, 102] },
  ],
  acts: [
    {
      id: 1,
      personId: 1,
      locationId: 101,
      time: '09:00:00',
      description: 'アリスが公園に到着',
    },
    {
      id: 2,
      personId: 2,
      locationId: 102,
      time: '09:15:00',
      description: 'ボブがカフェでコーヒーを注文',
    },
    {
      id: 3,
      personId: 3,
      locationId: 103,
      time: '09:20:00',
      description: 'キャロルが図書館で本を探す',
    },
    {
      id: 4,
      personId: 1,
      locationId: 102,
      time: '09:30:00',
      description: 'アリスがカフェに移動',
    },
    {
      id: 5,
      personId: 2,
      locationId: 102,
      time: '09:35:00',
      description: 'ボブがアリスと会話',
      interactedPersonId: 1,
    },
  ],
  props: [
    { id: 201, name: '本', description: 'キャロルが読んでいる本' },
    { id: 202, name: 'コーヒー', description: 'ボブが注文したコーヒー' },
  ],
  informations: [{ id: 301, content: '今日は晴れている', description: '天気情報' }],
  initialStates: [
    { personId: 1, locationId: 101, time: '09:00:00' },
    { personId: 2, locationId: 102, time: '09:00:00' },
    { personId: 3, locationId: 103, time: '09:00:00' },
  ],
}

test.describe('Event自動生成機能', () => {
  test('eventsフィールドなしでJSONをロードし、シミュレーションが動作する', async ({ page }) => {
    // データ入出力でロードしてシミュレーションへ
    await loadStoryData(page, testDataWithoutEvents)
    await navTo(page, 'シミュレーション')

    // 初期状態の確認（人物タグで確認。JSONテキストエリアと区別する）
    await expect(page.locator('.person-tag').filter({ hasText: 'アリス' }).first()).toBeVisible()
    await expect(page.locator('.person-tag').filter({ hasText: 'ボブ' }).first()).toBeVisible()
    await expect(page.locator('.person-tag').filter({ hasText: 'キャロル' }).first()).toBeVisible()

    // タイムラインスライダーが存在することを確認（min/max はデータの時間範囲に依存）
    const timelineSlider = page.locator('input[type="range"]')
    await expect(timelineSlider).toBeVisible()

    // 再生前の時刻を控える
    const timeDisplay = page.locator('.current-time-display')
    const startTime = await timeDisplay.textContent()

    // 再生ボタンをクリック
    await page.getByRole('button', { name: /再生|Play/i }).click()

    // シミュレーションが動作することを確認（時間が進む）
    await page.waitForTimeout(2000)

    // 時間表示が更新されていることを確認
    const currentTime = await timeDisplay.textContent()
    expect(currentTime).not.toBe(startTime)

    // 一時停止
    await page.getByRole('button', { name: /一時停止|Pause/i }).click()
  })

  test('タイムラインをドラッグして特定の時刻にジャンプできる', async ({ page }) => {
    // JSONデータをロードしてシミュレーションへ
    await loadStoryData(page, testDataWithoutEvents)
    await navTo(page, 'シミュレーション')

    // タイムラインスライダーを操作
    const timelineSlider = page.locator('input[type="range"]')

    // 9:30（570分）に設定
    await timelineSlider.evaluate((slider: HTMLInputElement) => {
      slider.value = '570'
      slider.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // 時刻表示が更新されることを確認
    await expect(page.locator('.current-time-display')).toContainText('09:30')

    // LocationDisplayでアリスがカフェにいることを確認
    const cafeSection = page.locator('.location-group').filter({ hasText: 'カフェ' })
    await expect(cafeSection.locator('.person-tag').filter({ hasText: 'アリス' })).toBeVisible()
  })

  test('actsの時刻順にイベントが処理される', async ({ page }) => {
    // 時刻が順不同のデータ
    const unorderedData = {
      ...testDataWithoutEvents,
      acts: [
        {
          id: 3,
          personId: 3,
          locationId: 103,
          time: '10:00:00',
          description: '遅いイベント',
        },
        {
          id: 1,
          personId: 1,
          locationId: 101,
          time: '08:00:00',
          description: '早いイベント',
        },
        {
          id: 2,
          personId: 2,
          locationId: 102,
          time: '09:00:00',
          description: '中間のイベント',
        },
      ],
    }

    await loadStoryData(page, unorderedData)
    await navTo(page, 'シミュレーション')

    // タイムラインを最後まで進める（実行ログは常時表示される）
    const timelineSlider = page.locator('input[type="range"]')
    const maxValue = await timelineSlider.getAttribute('max')
    await timelineSlider.evaluate((slider: HTMLInputElement, max) => {
      slider.value = max!
      slider.dispatchEvent(new Event('change', { bubbles: true }))
    }, maxValue)

    // 実行ログで acts が時刻順に処理されることを確認（初期状態エントリが先頭に入るため、
    // 行の絶対位置ではなく「早いイベント」が「遅いイベント」より前に来ることで検証する）
    const texts = await page.locator('.log-entry').allTextContents()
    const earlyIdx = texts.findIndex(t => t.includes('早いイベント'))
    const lateIdx = texts.findIndex(t => t.includes('遅いイベント'))
    expect(earlyIdx).toBeGreaterThanOrEqual(0)
    expect(lateIdx).toBeGreaterThan(earlyIdx)
  })

  test('空のactsでもエラーにならない', async ({ page }) => {
    const emptyActsData = {
      persons: [{ id: 1, name: 'テスト', color: '#000000' }],
      locations: [{ id: 1, name: 'テスト場所', connections: [] }],
      acts: [],
      props: [],
      informations: [],
      initialStates: [{ personId: 1, locationId: 1, time: '09:00:00' }],
    }

    await loadStoryData(page, emptyActsData)

    // エラーが表示されないことを確認
    await expect(page.locator('.error-output')).not.toBeVisible()

    await navTo(page, 'シミュレーション')

    // 基本的な表示が正常であることを確認（人物タグで確認）
    await expect(page.locator('.person-tag').filter({ hasText: 'テスト' }).first()).toBeVisible()
  })

  test('場所のレイアウト表示でキャラクターの移動が反映される', async ({ page }) => {
    await loadStoryData(page, testDataWithoutEvents)
    await navTo(page, 'シミュレーション')

    // 場所のレイアウト表示セクションを確認
    const layoutSection = page.locator('.location-layout')
    await expect(layoutSection).toBeVisible()

    // 初期状態：アリスは公園にいる
    await expect(layoutSection.locator('canvas')).toBeVisible()

    // 9:30に移動（アリスがカフェに移動）
    const timelineSlider = page.locator('input[type="range"]')
    await timelineSlider.evaluate((slider: HTMLInputElement) => {
      slider.value = '570' // 9:30 = 570分
      slider.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // アニメーションが完了するまで待つ
    await page.waitForTimeout(1000)

    // LocationDisplayでアリスがカフェにいることを確認
    const locationDisplay = page.locator('.location-display')
    const cafeSection = locationDisplay.locator('.location-group').filter({ hasText: 'カフェ' })
    await expect(cafeSection.locator('.person-tag').filter({ hasText: 'アリス' })).toBeVisible()
  })
})
