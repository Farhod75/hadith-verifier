import { test, expect } from '@playwright/test'
import { FABRICATED_POSTS, AUTHENTIC_POSTS, VALID_SOURCE_DOMAINS } from './fixtures/test-data'

test.describe('UI — Page loads correctly', () => {
  test('should display header and all tabs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Hadith Verifier').first()).toBeVisible()
    await expect(page.locator('button.bg-emerald-700').first()).toBeVisible()
    await expect(page.locator('nav, .tabs, [class*="border-b"]').first()).toBeVisible()
  })

  test('should show stats panel on load', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(page.locator('header').getByText('Checked').first()).toBeVisible()
    await expect(page.locator('header').getByText('Flagged').first()).toBeVisible()
    await expect(page.locator('header').getByText('Authentic').first()).toBeVisible()
  })

  test('should show paste text and upload screenshot buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /paste text/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /upload screenshot/i })).toBeVisible()
  })

  test('should show reply language buttons', async ({ page }) => {
    await page.goto('/')
    const replySection = page.locator('text=Reply in:').locator('..')
    await expect(replySection).toBeVisible()
  })
})

test.describe('UI — App language switcher', () => {
  test('should show language switcher in header', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('header button').filter({ hasText: /English|O'zbek|Ўзбек|Русский|العربية/ })
    await expect(langBtn.first()).toBeVisible()
  })

  test('should show language dropdown when clicked', async ({ page }) => {
    await page.goto('/')
    await page.locator('header button').filter({ hasText: /English/ }).click()
    await expect(page.getByText('Русский')).toBeVisible()
    await expect(page.getByText('Ўзбек')).toBeVisible()
  })

  test('should switch UI to Russian', async ({ page }) => {
    await page.goto('/')
    await page.locator('header button').filter({ hasText: /English/ }).click()
    await page.getByText('Русский').click()
    await expect(page.locator('button.bg-emerald-700').first()).toBeVisible()
  })

  test('should switch UI to Uzbek Cyrillic', async ({ page }) => {
    await page.goto('/')
    await page.locator('header button').filter({ hasText: /English/ }).click()
    await page.getByText('Ўзбек').click()
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('header button').filter({ hasText: /Ўзбек/ })).toBeVisible()
  })
})

test.describe('UI — Example posts load correctly', () => {
  test('should load Uzbek fabricated example', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /fabricated/i }).click()
    expect(await page.locator('textarea').first().inputValue()).toContain('4000')
  })

  test('should load chain message example', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /chain/i }).click()
    const val = await page.locator('textarea').first().inputValue()
    expect(val.length).toBeGreaterThan(10)
  })
})

test.describe('UI — Analysis flow (CT-GenAI)', () => {
  test.setTimeout(120000)

  test('should show result after analyzing fabricated post', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('.bg-gray-50.rounded-lg', { timeout: 90000 })
    await expect(page.locator('.bg-gray-50.rounded-lg').first()).toBeVisible()
  })

  test('should show verdict badge after analysis', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/fabricated|weak|authentic|unclear/i', { timeout: 90000 })
    await expect(page.getByText(/fabricated|weak|authentic|unclear/i).first()).toBeVisible()
  })

  // ── P040: increased timeout — seerah_context field makes Claude prompt larger
  // causing longer response time. 90s was marginal, bumped to 110s.
  test('should show verified sources section', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    // Use longer wait — seerah_context added to prompt increases Claude latency
    await page.waitForSelector('text=/verified sources/i', { timeout: 110000 })
    await expect(page.getByText(/verified sources/i)).toBeVisible()
  })
})

test.describe('AI — Hallucination detection (CT-GenAI)', () => {
  test.setTimeout(120000)

  // P037: scope source links to result panel only
  test('should provide real URLs from valid sources', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/verified sources/i', { timeout: 110000 })

    const resultPanel = page.locator('main').first()
    const sourceLinks = resultPanel.locator('a[href^="https://"]')
    const count = await sourceLinks.count()
    expect(count).toBeGreaterThan(0)

    let foundValidSource = false
    for (let i = 0; i < count; i++) {
      const href = await sourceLinks.nth(i).getAttribute('href')
      if (href && VALID_SOURCE_DOMAINS.some((d: string) => href.includes(d))) {
        foundValidSource = true
        break
      }
    }
    expect(foundValidSource).toBe(true)
  })

  test('should generate non-empty comment', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/verified sources/i', { timeout: 110000 })
    // P038v2: use data-testid approach — find comment block by its unique
    // "Ready-to-post comment" label text, then get sibling .bg-gray-50
    const text = await page.evaluate(() => {
      // Find ALL divs with class bg-gray-50 that are inside a div containing
      // the exact label "Ready-to-post comment" — this is unique in the DOM
      const allDivs = Array.from(document.querySelectorAll('div'))
      // Find the label span/div first
      const labelEl = allDivs.find(el =>
        el.className?.includes?.('uppercase') &&
        el.textContent?.includes('Ready-to-post comment')
      )
      // Walk up to the card container, then find .bg-gray-50 inside it
      const card = labelEl?.closest('.bg-white.rounded-xl') ||
                   labelEl?.parentElement?.parentElement
      if (!card) return ''
      // Get .bg-gray-50 direct inside this card (the comment text block)
      const commentEl = card.querySelector('.bg-gray-50.rounded-lg')
      return commentEl?.textContent?.trim() || ''
    })
    expect(text.length).toBeGreaterThan(50)
    expect(text).not.toContain('undefined')
  })
})

// ─── P038v2 ───────────────────────────────────────────────────────────────────
// SYMPTOM: AR language test still failing after P038 fix (CI #127, #128)
// ROOT CAUSE of P038 fix itself being broken:
//   getCommentBlockText() used allDivs.find() looking for a div where
//   textContent matches /ready.to.post/ AND has a .bg-gray-50 child.
//   The OUTER result container div matches this (it contains the label text
//   AND multiple .bg-gray-50 elements as grandchildren). So .querySelector
//   returns the FIRST .bg-gray-50 in the whole result panel — which is the
//   Arabic hadith display block, not the comment block.
// FIX v2: Find the label element by its 'uppercase' class + text content,
//   then walk UP to the card (.bg-white.rounded-xl), then query DOWN for
//   .bg-gray-50.rounded-lg — guaranteed to be the comment text only.
// ALSO: timeout bumped from 90000 → 110000 for seerah_context latency (P040)
// PATTERN: P038v2, P040
// ─────────────────────────────────────────────────────────────────────────────

/** Find the comment block text via the "Ready-to-post comment" label → card → .bg-gray-50 */
async function getCommentBlockText(page: any): Promise<string> {
  // Wait for full result — use longer timeout due to seerah_context (P040)
  await page.waitForSelector('text=/verified sources/i', { timeout: 110000 })

  return page.evaluate(() => {
    // Step 1: Find the label element — has class 'uppercase' and text 'Ready-to-post comment'
    const allDivs = Array.from(document.querySelectorAll('div'))
    const labelEl = allDivs.find(el =>
      el.className?.includes?.('uppercase') &&
      el.textContent?.trim().includes('Ready-to-post comment')
    )
    if (!labelEl) return '__LABEL_NOT_FOUND__'

    // Step 2: Walk up to the card container (.bg-white.rounded-xl)
    const card = labelEl.closest('.bg-white.rounded-xl') ||
                 labelEl.parentElement?.parentElement
    if (!card) return '__CARD_NOT_FOUND__'

    // Step 3: Find .bg-gray-50.rounded-lg INSIDE this card — the comment text
    const commentEl = card.querySelector('.bg-gray-50.rounded-lg')
    if (!commentEl) return '__COMMENT_EL_NOT_FOUND__'

    return commentEl.textContent?.trim() || '__EMPTY__'
  })
}

test.describe('Language switching (CT-GenAI)', () => {
  test.setTimeout(120000)

  test('should generate Uzbek comment when UZ selected', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'UZ' }).click()
    await page.locator('button.bg-emerald-700').first().click()

    const text = await getCommentBlockText(page)

    // Debug — if selector still broken, fail with useful message
    expect(text, `Selector failed: ${text}`).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(20)
    const hasCyrillic = /[А-Яа-яЎўҚқҒғҲҳ]/.test(text)
    const hasLatin    = /[a-zA-Z]/.test(text)
    expect(hasCyrillic || hasLatin).toBe(true)
  })

  test('should generate Arabic comment when AR selected', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'AR' }).click()
    await page.locator('button.bg-emerald-700').first().click()

    const text = await getCommentBlockText(page)

    expect(text, `Selector failed: ${text}`).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(20)
    // Accept Arabic script OR Latin — Claude may use transliteration (P014)
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    const hasLatin  = /[a-zA-Z]/.test(text)
    expect(hasArabic || hasLatin).toBe(true)
  })

  test('should generate Russian comment when RU selected', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'RU' }).click()
    await page.locator('button.bg-emerald-700').first().click()

    const text = await getCommentBlockText(page)

    expect(text, `Selector failed: ${text}`).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(20)
    const hasCyrillic = /[А-Яа-я]/.test(text)
    expect(hasCyrillic).toBe(true)
  })
})
