import { test, expect } from '@playwright/test'

const seed = {
  persons: [{ id: 1, name: '太郎', color: '#3b82f6' }],
  locations: [
    { id: 1, name: '広場', connections: [2], x: 0, y: 0 },
    { id: 2, name: '図書館', connections: [1], x: 100, y: 0 },
  ],
  props: [{ id: 1, name: '鍵', currentLocation: '2' }],
  informations: [],
  initialStates: [{ personId: 1, locationId: 1, time: '09:00' }],
  acts: [
    { id: 1, personId: 1, locationId: 1, time: '09:00', startTime: 0, description: 'いる' },
    {
      id: 2,
      personId: 1,
      locationId: 1,
      time: '09:10',
      startTime: 10,
      type: 'GIVE',
      propId: 1,
      interactedPersonId: 1,
      description: '鍵を渡す',
    },
  ],
}

test.describe('空間ワークスペース', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/simulation')
    await page.locator('textarea').fill(JSON.stringify(seed))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()
  })

  test('空間ワークスペースに場所と動線が重なり、破綻場所が示される', async ({ page }) => {
    await page.getByRole('link', { name: '空間', exact: true }).click()
    await expect(page).toHaveURL(/\/space/)

    // 場所ノードが存在する
    const loc1 = page.locator('[data-testid="spatial-loc-1"]')
    const loc2 = page.locator('[data-testid="spatial-loc-2"]')
    await expect(loc1).toHaveCount(1)
    await expect(loc2).toHaveCount(1)

    // 広場(id=1)は破綻あり（太郎が未所持の鍵を渡そうとする）
    await expect(loc1).toHaveAttribute('data-breakage', 'true')
    // 図書館(id=2)は破綻なし
    await expect(loc2).toHaveAttribute('data-breakage', 'false')

    // 太郎の動線（同一場所のみなので circle として描画）が存在する
    const path1 = page.locator('[data-testid="spatial-path-1"]')
    await expect(path1).toHaveCount(1)
  })
})
