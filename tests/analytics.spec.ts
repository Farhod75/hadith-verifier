// tests/analytics.spec.ts
// Google Analytics 4 — Script Loading Tests
// Verifies GA4 tag (G-32J9GLEBKS) loads correctly in production

import { test, expect } from '@playwright/test'

const GA_ID = 'G-32J9GLEBKS'

test.describe('Analytics — GA4 script loading', () => {

  test('googletagmanager script tag is present in HTML', async ({ page }) => {
  await page.goto('/')

  // Next.js renders GA config inline — check for gaId in page source
  const html = await page.content()
  expect(html).toContain(GA_ID)
})

  test('gtag function is defined on window', async ({ page }) => {
    await page.goto('/')
    // Wait for scripts to initialize
    await page.waitForFunction(() => typeof window.gtag === 'function', { timeout: 5000 })
    const gtagExists = await page.evaluate(() => typeof window.gtag === 'function')
    expect(gtagExists).toBe(true)
  })

  test('GA4 network request fires on page load', async ({ page }) => {
    const gaRequests: string[] = []

    page.on('request', req => {
      if (req.url().includes('googletagmanager.com/gtag')) {
        gaRequests.push(req.url())
      }
    })

    await page.goto('/')
    await page.waitForTimeout(2000)

    expect(gaRequests.length).toBeGreaterThan(0)
    expect(gaRequests[0]).toContain(GA_ID)
  })

  test('dataLayer array is initialized', async ({ page }) => {
  await page.goto('/')

  // Wait for dataLayer to be initialized by Next.js
  await page.waitForFunction(
    () => Array.isArray(window.dataLayer) && window.dataLayer.length > 0,
    { timeout: 10000 }
  )

  const dataLayerExists = await page.evaluate(
    () => Array.isArray(window.dataLayer) && window.dataLayer.length > 0
  )
  expect(dataLayerExists).toBe(true)
})

})