import { test, expect } from '@playwright/test'
import { FABRICATED_POSTS, AUTHENTIC_POSTS, VALID_SOURCE_DOMAINS } from './fixtures/test-data'

test.describe('UI — Page loads correctly', () => {
  test('should display header and all tabs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Hadith Verifier').first()).toBeVisible()
    await expect(page.locator('button.bg-emerald-700').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sources/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /admin/i })).toBeVisible()
  })

  test('should show stats panel on load', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Checked')).toBeVisible()
    await expect(page.getByText('Flagged')).toBeVisible()
    await expect(page.getByText('Authentic')).toBeVisible()
  })

  test('should show language toggle buttons', async ({ page }) => {
    await page.goto('/')
    for (const lang of ['EN', 'UZ', 'AR', 'RU']) {
      await expect(page.getByRole('button', { name: lang })).toBeVisible()
    }
  })

  test('should show example post buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /fabricated/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /chain/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /authentic/i })).toBeVisible()
  })

  test('should show paste text and upload screenshot buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /paste text/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /upload screenshot/i })).toBeVisible()
  })
})

test.describe('UI — App language switcher', () => {
  test('should show language switcher in header', async ({ page }) => {
    await page.goto('/')
    // Language switcher button with flag
    const langBtn = page.locator('header button').filter({ hasText: /English|O\'zbek|Ўзбек|Русский|العربية/ })
    await expect(langBtn).toBeVisible()
  })

  test('should show language dropdown when clicked', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('header button').filter({ hasText: /English/ })
    await langBtn.click()
    await expect(page.getByText("O'zbek")).toBeVisible()
    await expect(page.getByText('Ўзбек')).toBeVisible()
    await expect(page.getByText('Русский')).toBeVisible()
  })

  test('should switch UI to Russian when selected', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('header button').filter({ hasText: /English/ })
    await langBtn.click()
    await page.getByText('Русский').click()
    await expect(page.getByText('Анализ поста')).toBeVisible()
    await expect(page.getByText('Проверено')).toBeVisible()
  })

  test('should switch UI to Uzbek Cyrillic when selected', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('header button').filter({ hasText: /English/ })
    await langBtn.click()
    await page.getByText('Ўзбек').click()
    await expect(page.getByText('Текширилди')).toBeVisible()
  })
})

test.describe('UI — Example posts load correctly', () => {
  test('should load Uzbek fabricated example into textarea', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /fabricated/i }).click()
    const value = await page.locator('textarea').first().inputValue()
    expect(value).toContain('4000')
  })

  test('should load chain message example', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /chain/i }).click()
    const value = await page.locator('textarea').first().inputValue()
    expect(value.toLowerCase()).toContain('share')
  })

  test('should load authentic example', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /authentic/i }).click()
    const value = await page.locator('textarea').first().inputValue()
    expect(value).toContain('Bukhari')
  })
})

test.describe('AI — Fabricated hadith detection', () => {
  test.setTimeout(90000)

  test('should detect Uzbek fabricated post as fabricated or weak', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('.bg-red-50, .bg-amber-50', { timeout: 60000 })
    const text = await page.locator('.bg-red-50, .bg-amber-50').first().textContent()
    expect(text?.toLowerCase().includes('fabricated') || text?.toLowerCase().includes('weak')).toBe(true)
  })

  test('should detect chain message as fabricated or weak', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('.bg-red-50, .bg-amber-50', { timeout: 60000 })
    const text = await page.locator('.bg-red-50, .bg-amber-50').first().textContent()
    expect(text?.toLowerCase().includes('fabricated') || text?.toLowerCase().includes('weak')).toBe(true)
  })
})

test.describe('AI — Output quality validation (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('should always return a verdict', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('.bg-red-50, .bg-amber-50, .bg-green-50, .bg-gray-50', { timeout: 60000 })
    await expect(page.locator('.bg-red-50, .bg-amber-50, .bg-green-50').first()).toBeVisible()
  })

  test('should always show confidence level', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/confidence/i', { timeout: 60000 })
    const text = await page.getByText(/confidence/i).first().textContent()
    expect(text?.includes('high') || text?.includes('medium') || text?.includes('low')).toBe(true)
  })

  test('should show red flags for fabricated posts', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/red flags/i', { timeout: 60000 })
    await expect(page.getByText(/red flags/i)).toBeVisible()
  })

  test('should provide authentic alternative', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/authentic scholarship/i', { timeout: 60000 })
    await expect(page.getByText(/authentic scholarship/i)).toBeVisible()
  })

  test('should provide source references', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/verified sources/i', { timeout: 60000 })
    await expect(page.getByText(/verified sources/i)).toBeVisible()
  })
})

test.describe('AI — Hallucination detection (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('should provide real URLs from valid sources', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('a[href^="https://"]', { timeout: 60000 })
    const links = page.locator('a[href^="https://"]')
    expect(await links.count()).toBeGreaterThan(0)
    const href = await links.first().getAttribute('href')
    expect(VALID_SOURCE_DOMAINS.some(d => href?.includes(d))).toBe(true)
  })

  test('should generate non-empty suggested comment', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })
    const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
    expect(text?.length).toBeGreaterThan(50)
    expect(text).not.toContain('undefined')
  })
})

test.describe('Language switching (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('should generate Uzbek comment when UZ selected', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.getByRole('button', { name: 'UZ' }).click()
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })
    const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
    expect(text?.includes('Assalomu') || text?.includes('alaykum') || text?.includes('hadis') || text?.includes('Alloh')).toBe(true)
  })

  test('should generate Arabic comment when AR selected', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.getByRole('button', { name: 'AR' }).click()
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })
    const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
    expect(/[\u0600-\u06FF]/.test(text || '')).toBe(true)
  })

  test('should generate Russian comment when RU selected', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.getByRole('button', { name: 'RU' }).click()
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })
    const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
    expect(/[\u0400-\u04FF]/.test(text || '')).toBe(true)
  })
})

test.describe('Copy comment functionality', () => {
  test.setTimeout(90000)

  test('should show copy button after analysis', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/copy comment/i', { timeout: 60000 })
    await expect(page.getByRole('button', { name: /copy comment/i })).toBeVisible()
  })
})

test.describe('Stats counter', () => {
  test.setTimeout(90000)

  test('should increment checked count after analysis', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('.bg-red-50, .bg-amber-50, .bg-green-50', { timeout: 60000 })
    const num = await page.locator('text=Checked').locator('..').locator('div').first().textContent()
    expect(Number(num)).toBeGreaterThan(0)
  })
})

test.describe('Sources tab', () => {
  test('should show all three tiers', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /sources/i }).click()
    await expect(page.getByText(/tier 1/i)).toBeVisible()
    await expect(page.getByText(/tier 2/i)).toBeVisible()
    await expect(page.getByText(/tier 3/i)).toBeVisible()
  })

  test('should show Dorar.net', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /sources/i }).click()
    await expect(page.getByText(/dorar/i)).toBeVisible()
  })

  test('should show Sunnah.com', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /sources/i }).click()
    await expect(page.getByText(/sunnah/i).first()).toBeVisible()
  })

  test('should show clickable links', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /sources/i }).click()
    expect(await page.locator('a[href^="https://"]').count()).toBeGreaterThan(5)
  })
})

test.describe('Admin queue tab', () => {
  test('should load without errors', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /admin/i }).click()
    await expect(page.getByText(/flagged posts queue/i)).toBeVisible()
  })
})

test.describe('Dua corrector tab', () => {
  test('should show dua corrector tab button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /dua corrector/i })).toBeVisible()
  })

  test('should load dua corrector interface', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /dua corrector/i }).click()
    // Use specific selector to avoid strict mode violation
    await expect(page.locator('.text-xs.font-medium.text-gray-500').filter({ hasText: /DUA CORRECTOR/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /check dua/i })).toBeVisible()
  })

  test('should load wrong order example', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /dua corrector/i }).click()
    await page.getByRole('button', { name: /wrong order/i }).click()
    const value = await page.locator('textarea').first().inputValue()
    expect(value.length).toBeGreaterThan(10)
  })
})

test.describe('Mobile responsiveness', () => {
  test('should be usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByText('Hadith Verifier').first()).toBeVisible()
    await expect(page.locator('textarea').first()).toBeVisible()
  })
})

test.describe('Clear functionality', () => {
  test('should clear textarea when Clear clicked', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill('Some test text')
    await page.getByRole('button', { name: 'Clear' }).first().click()
    expect(await page.locator('textarea').first().inputValue()).toBe('')
  })
})
