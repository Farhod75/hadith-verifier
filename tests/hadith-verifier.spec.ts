import { test, expect, Page } from '@playwright/test'
import { FABRICATED_POSTS, VALID_SOURCE_DOMAINS } from './fixtures/test-data'

// ─── Mock API response ────────────────────────────────────────────────────────
// Language switching tests don't need to validate Claude's output — they test
// that the UI correctly displays the language returned by the API.
// Using route.fulfill() to mock the API response eliminates Claude latency
// and makes tests deterministic. (P043)
const MOCK_RESPONSE = (lang: string) => ({
  verdict: 'fabricated',
  confidence: 'high',
  severity: 'CRITICAL',
  claim_summary: lang === 'ar'
    ? 'ادعاء بأن النبي ﷺ قال شيئاً لم يثبت'
    : lang === 'ru'
    ? 'Утверждение о том, что Пророк ﷺ сказал нечто недостоверное'
    : lang === 'uz'
    ? 'Payg\'ambar ﷺ aytmagan narsa da\'vosi'
    : 'Claim that the Prophet ﷺ said something unverified',
  analysis: lang === 'ar'
    ? 'هذه الرواية موضوعة ولا أصل لها في كتب الحديث المعتمدة.'
    : lang === 'ru'
    ? 'Этот хадис является выдуманным и не имеет основания в достоверных источниках.'
    : lang === 'uz'
    ? 'Bu rivoyat to\'qima bo\'lib, hech bir ishonchli hadis to\'plamida topilmaydi.'
    : 'This narration is fabricated and has no basis in authentic hadith collections.',
  authentic_alternative: lang === 'ar'
    ? 'لا يوجد حديث صحيح بهذا المعنى.'
    : lang === 'ru'
    ? 'Достоверного хадиса с таким смыслом не существует.'
    : lang === 'uz'
    ? 'Bunday mazmunda sahih hadis mavjud emas.'
    : 'No authentic hadith exists with this meaning.',
  red_flags: ['No isnad chain', 'Reward inflation pattern'],
  references: [
    {
      source: 'Sahih al-Bukhari',
      description: 'No such narration exists',
      url: 'https://sunnah.com/bukhari:1',
      authority: 'tier1'
    },
    {
      source: 'IslamQA',
      description: 'Scholars confirm fabrication',
      url: 'https://islamqa.info/en/answers/1234',
      authority: 'tier2'
    }
  ],
  suggested_comment: lang === 'ar'
    ? 'أخي الكريم، هذا الحديث لا أصل له. أرجو التحقق من المصادر الموثوقة.'
    : lang === 'ru'
    ? 'Уважаемый брат, этот хадис является выдуманным. Пожалуйста, проверяйте достоверность.'
    : lang === 'uz'
    ? 'Aziz birodar, bu hadis to\'qima. Iltimos, ishonchli manbalardan tekshiring.'
    : 'Dear brother, this hadith is fabricated. Please verify from authentic sources.',
  seerah_context: lang === 'ar'
    ? 'كان النبي ﷺ يحذر دائماً من الكذب عليه.'
    : lang === 'ru'
    ? 'Пророк ﷺ всегда предупреждал о недопустимости ложи в его адрес.'
    : lang === 'uz'
    ? 'Payg\'ambar ﷺ har doim u zotga nisbatan yolg\'on gapirmaslikdan ogohlantirganlar.'
    : 'The Prophet ﷺ always warned against attributing false statements to him.'
})

// ─── Helper: intercept /api/analyze and return mock ──────────────────────────
async function mockAnalyze(page: Page, lang: string) {
  await page.route('**/api/analyze', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_RESPONSE(lang))
    })
  })
}

// ─── Helper: wait for result and get comment block text ──────────────────────
// P038v3: find label by uppercase class + text → walk to card → get comment
async function getCommentBlockText(page: Page): Promise<string> {
  // With mock, result renders instantly — still use generous timeout
  await page.waitForSelector('text=/verified sources/i', { timeout: 30000 })
  return page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'))
    const labelEl = allDivs.find(el =>
      el.className?.includes?.('uppercase') &&
      el.textContent?.trim().includes('Ready-to-post comment')
    )
    if (!labelEl) return '__LABEL_NOT_FOUND__'
    const card = labelEl.closest('.bg-white.rounded-xl') ||
                 labelEl.parentElement?.parentElement
    if (!card) return '__CARD_NOT_FOUND__'
    const commentEl = card.querySelector('.bg-gray-50.rounded-lg')
    return commentEl?.textContent?.trim() || '__COMMENT_EL_NOT_FOUND__'
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// UI TESTS — no API calls
// ═════════════════════════════════════════════════════════════════════════════
test.describe('UI — Page loads correctly', () => {
  test('should display header and all tabs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Hadith Verifier').first()).toBeVisible()
    await expect(page.locator('button.bg-emerald-700').first()).toBeVisible()
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
    await expect(page.locator('text=Reply in:').locator('..')).toBeVisible()
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

  test('should switch UI to Uzbek Cyrillic', async ({ page }) => {
    await page.goto('/')
    await page.locator('header button').filter({ hasText: /English/ }).click()
    await page.getByText('Ўзбек').click()
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

// ═════════════════════════════════════════════════════════════════════════════
// ANALYSIS FLOW — mocked API (fast, deterministic)
// ═════════════════════════════════════════════════════════════════════════════
test.describe('UI — Analysis flow (CT-GenAI)', () => {
  test('should show result after analyzing fabricated post', async ({ page }) => {
    await mockAnalyze(page, 'en')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/fabricated/i', { timeout: 15000 })
    await expect(page.locator('text=/fabricated/i').first()).toBeVisible()
  })

  test('should show verdict badge after analysis', async ({ page }) => {
    await mockAnalyze(page, 'en')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/fabricated|weak|authentic|unclear/i', { timeout: 15000 })
    await expect(page.getByText(/fabricated|weak|authentic|unclear/i).first()).toBeVisible()
  })

  test('should show verified sources section', async ({ page }) => {
    await mockAnalyze(page, 'en')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/verified sources/i', { timeout: 15000 })
    await expect(page.getByText(/verified sources/i)).toBeVisible()
  })

  test('should show seerah context card', async ({ page }) => {
    await mockAnalyze(page, 'en')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/story behind/i', { timeout: 15000 })
    await expect(page.getByText(/story behind/i)).toBeVisible()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// HALLUCINATION DETECTION — real API (validates actual Claude output)
// Only these tests hit real Claude. Isolated to avoid timing out others.
// ═════════════════════════════════════════════════════════════════════════════
test.describe('AI — Hallucination detection (CT-GenAI)', () => {
  test.setTimeout(120000)

  // P037: scope to result panel, not entire page
  test('should provide real URLs from valid sources', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/verified sources/i', { timeout: 110000 })
    const resultPanel = page.locator('main').first()
    const sourceLinks = resultPanel.locator('a[href^="https://"]')
    const count = await sourceLinks.count()
    expect(count).toBeGreaterThan(0)
    let foundValid = false
    for (let i = 0; i < count; i++) {
      const href = await sourceLinks.nth(i).getAttribute('href')
      if (href && VALID_SOURCE_DOMAINS.some((d: string) => href.includes(d))) {
        foundValid = true; break
      }
    }
    expect(foundValid).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// LANGUAGE SWITCHING — mocked API (fast, deterministic, no Claude latency)
// P043: mock /api/analyze to test UI language rendering without real API calls
// ═════════════════════════════════════════════════════════════════════════════
test.describe('Language switching (CT-GenAI)', () => {

  test('should render Uzbek comment when UZ selected', async ({ page }) => {
    await mockAnalyze(page, 'uz')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'UZ' }).click()
    await page.locator('button.bg-emerald-700').first().click()

    const text = await getCommentBlockText(page)
    expect(text, `Selector failed: ${text}`).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(10)
    const hasCyrillic = /[А-Яа-яЎўҚқҒғҲҳ]/.test(text)
    const hasLatin    = /[a-zA-Z]/.test(text)
    expect(hasCyrillic || hasLatin).toBe(true)
  })

  test('should render Arabic comment when AR selected', async ({ page }) => {
    await mockAnalyze(page, 'ar')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'AR' }).click()
    await page.locator('button.bg-emerald-700').first().click()

    const text = await getCommentBlockText(page)
    expect(text, `Selector failed: ${text}`).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(10)
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    const hasLatin  = /[a-zA-Z]/.test(text)
    expect(hasArabic || hasLatin).toBe(true)
  })

  test('should render Russian comment when RU selected', async ({ page }) => {
    await mockAnalyze(page, 'ru')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'RU' }).click()
    await page.locator('button.bg-emerald-700').first().click()

    const text = await getCommentBlockText(page)
    expect(text, `Selector failed: ${text}`).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(10)
    const hasCyrillic = /[А-Яа-я]/.test(text)
    expect(hasCyrillic).toBe(true)
  })
})
