import { test, expect } from '@playwright/test'

test.describe('Load Function', () => {
  test('basic load test', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()))
    page.on('pageerror', error => console.error('Page error:', error))

    // Navigate to the simulation page
    await page.goto('http://localhost:3000/simulation')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Take a screenshot before interaction
    await page.screenshot({ path: 'debug-before-load.png' })

    // Find the textarea and fill it with minimal JSON
    const textarea = page.locator('textarea').first()
    await textarea.fill(JSON.stringify({
      persons: [{ id: 1, name: 'TestPerson', color: '#FF0000' }],
      locations: [{ id: 1, name: 'TestLocation', connections: [] }],
      acts: [{ id: 1, personId: 1, locationId: 1, time: '09:00:00', description: 'TestAct' }],
      props: [],
      informations: [],
      initialStates: [{ personId: 1, locationId: 1, time: '09:00:00' }],
    }, null, 2))

    // Find and click the load button
    const loadButton = page.getByRole('button', { name: '物語データをロード' })
    await loadButton.click()

    // Wait a bit for the load to process
    await page.waitForTimeout(2000)

    // Take a screenshot after clicking load
    await page.screenshot({ path: 'debug-after-load-click.png' })

    // Check if error message is displayed
    const errorElement = page.locator('.error-output')
    const errorText = await errorElement.textContent().catch(() => null)
    console.log('Error text:', errorText)

    // Check if the person name appears anywhere on the page
    const personCount = await page.locator('text=TestPerson').count()
    console.log('Found TestPerson:', personCount, 'times')

    // Check if location name appears
    const locationCount = await page.locator('text=TestLocation').count()
    console.log('Found TestLocation:', locationCount, 'times')

    // Check if there's any content in the output area
    const outputArea = page.locator('.output-area')
    const outputText = await outputArea.textContent()
    console.log('Output area text length:', outputText.length)

    // Basic assertion - at least check the page didn't crash
    expect(await page.title()).toBe('Scene-Flow - イマーシブシアターシミュレーター')
  })
})