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

test.describe('マップエディタ基本機能', () => {
  test.beforeEach(async ({ page }) => {
    // シミュレーションページでデータを読み込む
    await page.goto('/simulation')
    await page.locator('textarea').fill(JSON.stringify(testMapData, null, 2))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await page.waitForTimeout(500)

    // マップエディタページに移動
    await page.getByRole('link', { name: 'マップエディタ' }).click()
    await expect(page).toHaveURL(/\/map-editor/)

    // 操作ガイドを閉じる
    await page.locator('.guide-header').click()
    await page.waitForTimeout(300)
  })

  test('マップエディタページが表示される', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('マップエディタ')
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(page.locator('text=ノード数: 2')).toBeVisible()
  })

  test('ノードを追加できる', async ({ page }) => {
    await page.getByRole('button', { name: 'ノード追加' }).click()
    await expect(page.locator('text=ノード数: 3')).toBeVisible()
  })

  test('保存機能が動作する', async ({ page }) => {
    await page.getByRole('button', { name: 'ノード追加' }).click()
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.locator('text=マップデータを保存しました')).toBeVisible()
  })

  test('元に戻す機能が動作する', async ({ page }) => {
    await page.getByRole('button', { name: 'ノード追加' }).click()
    await expect(page.locator('text=ノード数: 3')).toBeVisible()

    await page.getByRole('button', { name: '元に戻す' }).click()
    await expect(page.locator('text=ノード数: 2')).toBeVisible()
  })

  test('操作ガイドを開くことができる', async ({ page }) => {
    // ガイドヘッダーをクリックして開く
    await page.locator('.guide-header').click()
    await expect(page.locator('h4:has-text("基本操作")')).toBeVisible()
  })
})