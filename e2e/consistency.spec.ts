import { test, expect } from '@playwright/test'
import { loadStoryData, navTo } from './helpers'

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
    await loadStoryData(page, seed)
  })

  test('因果ビューで破綻ノードが表示される', async ({ page }) => {
    await navTo(page, '因果関係ビュー')
    await expect(page).toHaveURL(/\/causality/)
    const node = page.getByTestId('node-act-1')
    await expect(node).toBeVisible()
    await expect(node).toHaveAttribute('data-breakage', 'true')
  })

  test('ノードクリックで選択状態になる', async ({ page }) => {
    await navTo(page, '因果関係ビュー')
    await page.getByTestId('node-act-1').click()
    await expect(page.getByTestId('node-act-1')).toHaveAttribute('data-selected', 'true')
  })

  test('関係性リンクがナビにある（閲覧専用の相関図）', async ({ page }) => {
    // 「② 組む」プルダウンを開くと関係性リンクが現れる
    const nav = page.getByRole('navigation')
    await nav.getByRole('button', { name: /組む/ }).click()
    await expect(nav.getByRole('link', { name: '関係性' })).toHaveCount(1)
  })
})
