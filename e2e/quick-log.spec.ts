import { test, expect } from '@playwright/test'

const seed = {
  persons: [
    { id: 1, name: '太郎', color: '#FF0000' },
    { id: 2, name: '花子', color: '#00FF00' },
  ],
  locations: [
    { id: 1, name: '広場', connections: [2] },
    { id: 2, name: '図書館', connections: [1] },
  ],
  props: [],
  informations: [],
  initialStates: [{ personId: 1, locationId: 1, time: '09:00' }],
  acts: [],
}

/**
 * EntityCombobox に文字を入力して Enter で先頭候補を選択する。
 * Enter キーで候補一覧が閉じ、input の value がクリアされて選択済み状態になる。
 */
async function selectCombobox(
  page: import('@playwright/test').Page,
  label: string,
  text: string,
): Promise<void> {
  const input = page.getByLabel(label)
  await input.fill(text)
  // 候補リストが描画されるまで待機（filterで一致するものが出るまで）
  await expect(page.locator('ul').filter({ hasText: text }).first()).toBeVisible()
  await input.press('Enter')
  // 候補リストが閉じるまで待機（queryがクリアされてplaceholderに戻る）
  await expect(input).toHaveValue('')
}

test.describe('イベント入力（Quick Log）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(seed))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    // データロード成功通知を待つ
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()
    await page.getByRole('link', { name: 'イベント入力' }).click()
    await expect(page).toHaveURL(/\/log/)
  })

  test('Enter連射で複数イベントを追加でき、誰が/どこでが保持される', async ({ page }) => {
    // 「誰が」と「どこで」を最初に選択
    await selectCombobox(page, '誰が', '太郎')
    await selectCombobox(page, 'どこで', '広場')

    // 1件目のイベントを追加
    const description = page.getByLabel('何をした')
    await description.fill('到着した')
    await description.press('Enter')

    // 1件目がタイムラインに表示されることを確認
    await expect(page.locator('[class*="what"]').filter({ hasText: '到着した' })).toBeVisible()

    // 「何をした」がクリアされていることを確認（sticky保持の検証）
    await expect(description).toHaveValue('')

    // 2件目のイベントを追加（誰が/どこではそのまま）
    await description.fill('本を探した')
    await description.press('Enter')

    // 2件目もタイムラインに表示されることを確認
    await expect(page.locator('[class*="what"]').filter({ hasText: '本を探した' })).toBeVisible()

    // タイムラインに2件の行があることを確認（ul > li = タイムライン行のみ）
    await expect(page.locator('[class*="timeline"] > li')).toHaveCount(2)
  })

  test('移動Actなしの場所変化に動線バッジが出る', async ({ page }) => {
    // 1件目: 太郎が広場でイベント
    await selectCombobox(page, '誰が', '太郎')
    await selectCombobox(page, 'どこで', '広場')
    const description = page.getByLabel('何をした')
    await description.fill('広場にいる')
    await description.press('Enter')
    await expect(page.locator('[class*="what"]').filter({ hasText: '広場にいる' })).toBeVisible()

    // 2件目: 太郎が（移動Actなしで）図書館でイベント → 動線バッジが出るはず
    await selectCombobox(page, 'どこで', '図書館')
    await description.fill('図書館にいる')
    await description.press('Enter')
    await expect(page.locator('[class*="what"]').filter({ hasText: '図書館にいる' })).toBeVisible()

    // 動線バッジが表示されることを確認
    await expect(page.getByText('⚠ 動線')).toBeVisible()
  })
})
