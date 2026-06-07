import { test, expect } from '@playwright/test'

const seed = {
  persons: [
    { id: 1, name: '太郎', color: '#3b82f6' },
    { id: 2, name: '花子', color: '#ef4444' },
  ],
  locations: [
    { id: 1, name: '広場', connections: [2] },
    { id: 2, name: '図書館', connections: [1] },
  ],
  props: [{ id: 1, name: '鍵', currentLocation: '2' }],
  informations: [],
  initialStates: [
    { personId: 1, locationId: 1, time: '09:00' },
    { personId: 2, locationId: 1, time: '09:00' },
  ],
  acts: [
    {
      id: 1,
      personId: 1,
      locationId: 1,
      time: '09:10',
      startTime: 10,
      description: '鍵を渡す',
      type: 'GIVE',
      propId: 1,
      interactedPersonId: 2,
    },
  ],
}

test.describe('整合性: 因果ビューと凍結', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/simulation')
    await page.locator('textarea').fill(JSON.stringify(seed))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    // データロード成功通知を待つ
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()
  })

  test('因果ビューで破綻ノードが表示される', async ({ page }) => {
    await page.getByRole('link', { name: '因果関係ビュー' }).click()
    await expect(page).toHaveURL(/\/causality/)
    const node = page.getByTestId('node-act-1')
    await expect(node).toBeVisible()
    await expect(node).toHaveAttribute('data-breakage', 'true')
  })

  test('ノードクリックで選択状態になる', async ({ page }) => {
    await page.getByRole('link', { name: '因果関係ビュー' }).click()
    await page.getByTestId('node-act-1').click()
    await expect(page.getByTestId('node-act-1')).toHaveAttribute('data-selected', 'true')
  })

  test('関係性リンクがナビにある（閲覧専用の相関図）', async ({ page }) => {
    await expect(page.getByRole('link', { name: '関係性' })).toHaveCount(1)
  })
})
