import { test, expect } from '@playwright/test'

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
  informations: [
    { id: 301, content: '今日は晴れている', description: '天気情報' },
  ],
  initialStates: [
    { personId: 1, locationId: 101, time: '09:00:00' },
    { personId: 2, locationId: 102, time: '09:00:00' },
    { personId: 3, locationId: 103, time: '09:00:00' },
  ],
}

test.describe('Event自動生成機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/simulation')
  })

  test('eventsフィールドなしでJSONをロードし、シミュレーションが動作する', async ({ page }) => {
    // JSONデータを入力
    await page.locator('textarea').fill(JSON.stringify(testDataWithoutEvents, null, 2))

    // データをロード
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // 成功通知を確認
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()

    // 初期状態の確認
    await expect(page.locator('text=アリス')).toBeVisible()
    await expect(page.locator('text=ボブ')).toBeVisible()
    await expect(page.locator('text=キャロル')).toBeVisible()

    // タイムラインスライダーが正しい時間範囲を持つことを確認
    const timelineSlider = page.locator('input[type="range"]')
    await expect(timelineSlider).toHaveAttribute('min', '0')

    // 再生ボタンをクリック
    await page.getByRole('button', { name: /再生|Play/i }).click()

    // シミュレーションが動作することを確認（時間が進む）
    await page.waitForTimeout(2000)

    // 時間表示が更新されていることを確認
    const timeDisplay = page.locator('.current-time-display')
    const currentTime = await timeDisplay.textContent()
    expect(currentTime).not.toBe('09:00:00')

    // 一時停止
    await page.getByRole('button', { name: /一時停止|Pause/i }).click()
  })

  test('タイムラインをドラッグして特定の時刻にジャンプできる', async ({ page }) => {
    // JSONデータをロード
    await page.locator('textarea').fill(JSON.stringify(testDataWithoutEvents, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()

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
    const cafeSection = page.locator('text=カフェ').locator('..')
    await expect(cafeSection.locator('text=アリス')).toBeVisible()
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

    await page.locator('textarea').fill(JSON.stringify(unorderedData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // イベントログを開く
    const eventLogSection = page.locator('details').filter({ hasText: 'イベントログ' })
    if (!(await eventLogSection.getAttribute('open'))) {
      await eventLogSection.locator('summary').click()
    }

    // タイムラインを最後まで進める
    const timelineSlider = page.locator('input[type="range"]')
    const maxValue = await timelineSlider.getAttribute('max')
    await timelineSlider.evaluate((slider: HTMLInputElement, max) => {
      slider.value = max!
      slider.dispatchEvent(new Event('change', { bubbles: true }))
    }, maxValue)

    // イベントログが時刻順に表示されることを確認
    const logEntries = page.locator('.log-entry')
    const firstEntry = await logEntries.first().textContent()
    const lastEntry = await logEntries.last().textContent()

    expect(firstEntry).toContain('08:00')
    expect(lastEntry).toContain('10:00')
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

    await page.locator('textarea').fill(JSON.stringify(emptyActsData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()

    // エラーが表示されないことを確認
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()
    await expect(page.locator('.error-output')).not.toBeVisible()

    // 基本的な表示が正常であることを確認
    await expect(page.locator('text=テスト')).toBeVisible()
  })

  test('場所のレイアウト表示でキャラクターの移動が反映される', async ({ page }) => {
    await page.locator('textarea').fill(JSON.stringify(testDataWithoutEvents, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()

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
    const cafeSection = locationDisplay.locator('.location-box').filter({ hasText: 'カフェ' })
    await expect(cafeSection.locator('.person-tag').filter({ hasText: 'アリス' })).toBeVisible()
  })
})