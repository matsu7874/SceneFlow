import { test } from '@playwright/test'

test.describe('Scene Flow Feature Screenshots', () => {
  test('capture map editor features in detail', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    // Go to Map Editor
    await page.goto('http://localhost:3001/map-editor')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Try to interact with the map
    const canvas = page.locator('canvas').first()
    if (await canvas.count() > 0) {
      // Click on the canvas to show any interaction
      await canvas.click({ position: { x: 200, y: 200 } })
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'screenshots/map-editor-interaction.png', fullPage: true })
    }

    // Look for toolbar buttons
    const toolbar = page.locator('[class*="toolbar"], [class*="controls"], [class*="MapEditor_toolbar"]')
    if (await toolbar.count() > 0) {
      await page.screenshot({ path: 'screenshots/map-editor-toolbar-focus.png', fullPage: true })
    }
  })

  test('capture entity editor with form', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    // Go to Entity Editor
    await page.goto('http://localhost:3001/entities')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Look for add button
    const addButton = page.locator('button:has-text("追加"), button:has-text("Add"), button:has-text("+")').first()
    if (await addButton.count() > 0) {
      await addButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'screenshots/entity-editor-add-form.png', fullPage: true })
    }
  })

  test('capture simulation in action', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    // Go to Simulation page
    await page.goto('http://localhost:3001/simulation')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Look for play/start button
    const playButton = page.locator('button:has-text("再生"), button:has-text("Play"), button:has-text("開始"), button:has-text("Start")').first()
    if (await playButton.count() > 0) {
      await playButton.click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'screenshots/simulation-running.png', fullPage: true })
    }
  })
})