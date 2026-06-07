import { test, expect } from '@playwright/test'

// テストデータ
const testMapData = {
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
  initialStates: [
    { personId: 1, locationId: 1, time: '09:00' },
    { personId: 2, locationId: 2, time: '09:00' },
  ],
  acts: [],
}

test.describe('空間ワークスペース基本機能', () => {
  test.beforeEach(async ({ page }) => {
    // シミュレーションページでデータを読み込む
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(testMapData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // 空間ワークスペースへ移動
    await page.getByRole('link', { name: '空間', exact: true }).click()
    await expect(page).toHaveURL(/\/space/)
  })

  test('空間ワークスペースが表示される', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('空間')
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(page.locator('text=ノード数: 2')).toBeVisible()
  })

  test('ノードを追加できる', async ({ page }) => {
    await page.getByRole('button', { name: 'ノード追加' }).click()
    await expect(page.locator('text=ノード数: 3')).toBeVisible()
  })

  test('編集は自動保存され、リロード後も保持される', async ({ page }) => {
    await page.getByRole('button', { name: 'ノード追加' }).click()
    await expect(page.locator('text=ノード数: 3')).toBeVisible()
    // debounce(250ms) を待って自動保存させる
    await page.waitForTimeout(600)
    await page.reload()
    await expect(page).toHaveURL(/\/space/)
    await expect(page.locator('text=ノード数: 3')).toBeVisible()
  })

  test('元に戻す機能が動作する', async ({ page }) => {
    await page.getByRole('button', { name: 'ノード追加' }).click()
    await expect(page.locator('text=ノード数: 3')).toBeVisible()

    await page.getByRole('button', { name: '元に戻す' }).click()
    await expect(page.locator('text=ノード数: 2')).toBeVisible()
  })

  test('操作ガイドが常設表示される', async ({ page }) => {
    // PageGuide は既定で開いており、操作ガイドの内容が見える
    await expect(page.getByText('操作ガイド')).toBeVisible()
    await expect(page.getByText('場所を追加', { exact: false })).toBeVisible()
  })
})
