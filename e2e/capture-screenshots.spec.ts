import { test } from '@playwright/test'

test.describe('Scene Flow Screenshots', () => {
  test('capture all main pages', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 })

    // 1. Home page
    await page.goto('http://localhost:3001/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'screenshots/01-home-page.png', fullPage: true })

    // 2. Map Editor page
    await page.click('text=マップエディタ')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for any animations
    await page.screenshot({ path: 'screenshots/02-map-editor-page.png', fullPage: true })

    // 3. Entity Editor page (エンティティ)
    await page.click('text=エンティティ')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'screenshots/03-entity-editor-page.png', fullPage: true })

    // 4. Relationships page (関係性)
    await page.click('text=関係性')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'screenshots/04-relationships-page.png', fullPage: true })

    // 5. Causality page (因果関係)
    await page.click('text=因果関係')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'screenshots/05-causality-page.png', fullPage: true })

    // 6. Validation page (検証)
    await page.click('text=検証')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'screenshots/06-validation-page.png', fullPage: true })

    // 7. Simulation page (シミュレーション)
    await page.click('text=シミュレーション')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'screenshots/07-simulation-page.png', fullPage: true })
  })

  test('capture map editor features', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    // Go to Map Editor
    await page.goto('http://localhost:3001/map-editor')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Capture with grid
    await page.screenshot({ path: 'screenshots/map-editor-with-grid.png', fullPage: true })

    // Toggle grid if available
    const gridToggle = page.locator('button:has-text("グリッド")')
    if (await gridToggle.count() > 0) {
      await gridToggle.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'screenshots/map-editor-no-grid.png', fullPage: true })
    }

    // Check for minimap toggle
    const minimapToggle = page.locator('button:has-text("ミニマップ")')
    if (await minimapToggle.count() > 0) {
      await minimapToggle.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'screenshots/map-editor-with-minimap.png', fullPage: true })
    }
  })

  test('capture entity editor details', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    // Go to Entity Editor
    await page.goto('http://localhost:3001/entities')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Capture the entity list
    await page.screenshot({ path: 'screenshots/entity-editor-list.png', fullPage: true })

    // Try to click on the first entity if available
    const firstEntity = page.locator('.entity-item').first()
    if (await firstEntity.count() > 0) {
      await firstEntity.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'screenshots/entity-editor-detail.png', fullPage: true })
    }
  })
})