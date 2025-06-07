import { test } from '@playwright/test'

test.describe('Scene Flow Screenshots - Simple', () => {
  test('capture pages by direct navigation', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 })

    // 1. Home page
    await page.goto('http://localhost:3001/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/01-home-page.png', fullPage: true })

    // 2. Map Editor page - direct navigation
    await page.goto('http://localhost:3001/map-editor')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/02-map-editor-page.png', fullPage: true })

    // 3. Entity Editor page - direct navigation
    await page.goto('http://localhost:3001/entities')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/03-entity-editor-page.png', fullPage: true })

    // 4. Relationships page - direct navigation
    await page.goto('http://localhost:3001/relationships')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/04-relationships-page.png', fullPage: true })

    // 5. Causality page - direct navigation
    await page.goto('http://localhost:3001/causality')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/05-causality-page.png', fullPage: true })

    // 6. Validation page - direct navigation
    await page.goto('http://localhost:3001/validation')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/06-validation-page.png', fullPage: true })

    // 7. Simulation page - direct navigation
    await page.goto('http://localhost:3001/simulation')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/07-simulation-page.png', fullPage: true })
  })
})