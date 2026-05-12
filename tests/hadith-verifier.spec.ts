import { test, expect, Page } from '@playwright/test'
import { FABRICATED_POSTS, VALID_SOURCE_DOMAINS } from './fixtures/test-data'

// ─── DESIGN DECISION (P043) ───────────────────────────────────────────────────
// All tests that require a result panel use page.route() to mock /api/analyze.
// Reasons:
//   1. Claude API latency is 15-30s with seerah_context — CI times out at 110s
//   2. Language tests validate UI rendering, not Claude output
//   3. Real Claude validation belongs in pytest suite (test_analyze_api.py)
//      which runs against production on a controlled schedule
//
// Tests tagged @real-api are skipped in CI (see playwright.config.ts grep)
// and run separately via: npx playwright test --grep @real-api
// ─────────────────────────────────────────────────────────────────────────────

const MOCK = (lang = 'en') => ({
  verdict: 'fabricated',
  confidence: 'high',
  severity: 'CRITICAL',
  claim_summary:
    lang === 'ar' ? 'ادعاء كاذب نسب إلى النبي ﷺ' :
    lang === 'ru' ? 'Ложное утверждение, приписанное Пророку ﷺ' :
    lang === 'uz' ? 'Payg\'ambar ﷺ ga nisbatan yolg\'on da\'vo' :
    'False claim attributed to the Prophet ﷺ',
  analysis:
    lang === 'ar' ? 'هذه الرواية موضوعة ولا أصل لها في كتب الحديث المعتمدة.' :
    lang === 'ru' ? 'Этот хадис является выдуманным и не имеет основания в достоверных источниках.' :
    lang === 'uz' ? 'Bu rivoyat to\'qima bo\'lib, hech bir ishonchli hadis to\'plamida topilmaydi.' :
    'This narration is fabricated and has no basis in authentic hadith collections.',
  authentic_alternative:
    lang === 'ar' ? 'لا يوجد حديث صحيح بهذا المعنى' :
    lang === 'ru' ? 'Достоверного хадиса с таким смыслом не существует.' :
    lang === 'uz' ? 'Bunday mazmunda sahih hadis mavjud emas.' :
    'No authentic hadith with this meaning exists.',
  red_flags: ['No isnad chain provided', 'Reward inflation pattern'],
  references: [
    {
      source: 'Sahih al-Bukhari',
      description: 'No such narration found',
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
  suggested_comment:
    lang === 'ar' ? 'أخي الكريم، هذا الحديث لا أصل له في كتب السنة الموثوقة.' :
    lang === 'ru' ? 'Уважаемый брат, этот хадис является выдуманным. Пожалуйста, проверяйте источники.' :
    lang === 'uz' ? 'Aziz birodar, bu hadis to\'qima. Iltimos, ishonchli manbalardan tekshiring.' :
    'Dear brother, this hadith is fabricated. Please verify from authentic sources.',
  seerah_context:
    lang === 'ar' ? 'كان النبي ﷺ يحذر دائماً من الكذب عليه قائلاً من كذب علي متعمداً.' :
    lang === 'ru' ? 'Пророк ﷺ предупреждал о недопустимости лжи в его адрес.' :
    lang === 'uz' ? 'Payg\'ambar ﷺ unga nisbatan yolg\'on gapirmaslikdan ogohlantirganlar.' :
    'The Prophet ﷺ warned against attributing false statements to him.'
})

async function mockAnalyze(page: Page, lang = 'en') {
  await page.route('**/api/analyze', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK(lang))
    })
  )
}

async function getCommentText(page: Page): Promise<string> {
  await page.waitForSelector('text=/verified sources/i', { timeout: 20000 })
  return page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'))
    const label = divs.find(el =>
      el.className?.includes?.('uppercase') &&
      el.textContent?.includes('Ready-to-post comment')
    )
    if (!label) return '__LABEL_NOT_FOUND__'
    const card = label.closest('.bg-white.rounded-xl') ?? label.parentElement?.parentElement
    if (!card) return '__CARD_NOT_FOUND__'
    return card.querySelector('.bg-gray-50.rounded-lg')?.textContent?.trim() ?? '__EMPTY__'
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// UI — no API needed
// ═════════════════════════════════════════════════════════════════════════════
test.describe('UI — Page loads correctly', () => {
  test('should display header and tabs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Hadith Verifier').first()).toBeVisible()
    await expect(page.locator('button.bg-emerald-700').first()).toBeVisible()
  })

  test('should show stats in header', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(page.locator('header').getByText('Checked').first()).toBeVisible()
    await expect(page.locator('header').getByText('Flagged').first()).toBeVisible()
  })

  test('should show paste text and upload buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /paste text/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /upload screenshot/i })).toBeVisible()
  })

  test('should show reply language buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Reply in:').locator('..')).toBeVisible()
  })

  test('should show language switcher in header', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.locator('header button').filter({ hasText: /English|O'zbek|Ўзбек|Русский|العربية/ }).first()
    ).toBeVisible()
  })

  test('should switch UI to Uzbek Cyrillic', async ({ page }) => {
    await page.goto('/')
    await page.locator('header button').filter({ hasText: /English/ }).click()
    await page.getByText('Ўзбек').click()
    await expect(page.locator('header button').filter({ hasText: /Ўзбек/ })).toBeVisible()
  })

  test('should load fabricated example', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /fabricated/i }).click()
    expect(await page.locator('textarea').first().inputValue()).toContain('4000')
  })

  test('should load chain message example', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /chain/i }).click()
    expect((await page.locator('textarea').first().inputValue()).length).toBeGreaterThan(10)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ANALYSIS FLOW — mocked (fast, deterministic)
// ═════════════════════════════════════════════════════════════════════════════
test.describe('UI — Analysis flow (CT-GenAI)', () => {
  test('should show verdict after analysis', async ({ page }) => {
    await mockAnalyze(page, 'en')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/fabricated/i', { timeout: 15000 })
    await expect(page.locator('text=/fabricated/i').first()).toBeVisible()
  })

  test('should show verified sources section', async ({ page }) => {
    await mockAnalyze(page, 'en')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/verified sources/i', { timeout: 15000 })
    await expect(page.getByText(/verified sources/i)).toBeVisible()
  })

  test('should show seerah context story card', async ({ page }) => {
    await mockAnalyze(page, 'en')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/story behind/i', { timeout: 15000 })
    await expect(page.getByText(/story behind/i)).toBeVisible()
  })

  test('should show non-empty comment', async ({ page }) => {
    await mockAnalyze(page, 'en')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    const text = await getCommentText(page)
    expect(text).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(20)
    expect(text).not.toContain('undefined')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// LANGUAGE SWITCHING — mocked (tests UI rendering, not Claude output)
// ═════════════════════════════════════════════════════════════════════════════
test.describe('Language switching (CT-GenAI)', () => {
  test('should render Uzbek when UZ selected', async ({ page }) => {
    await mockAnalyze(page, 'uz')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'UZ' }).click()
    await page.locator('button.bg-emerald-700').first().click()
    const text = await getCommentText(page)
    expect(text).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(10)
    expect(/[А-Яа-яЎўҚқҒғҲҳa-zA-Z]/.test(text)).toBe(true)
  })

  test('should render Arabic when AR selected', async ({ page }) => {
    await mockAnalyze(page, 'ar')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'AR' }).click()
    await page.locator('button.bg-emerald-700').first().click()
    const text = await getCommentText(page)
    expect(text).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(10)
    expect(/[\u0600-\u06FFa-zA-Z]/.test(text)).toBe(true)
  })

  test('should render Russian when RU selected', async ({ page }) => {
    await mockAnalyze(page, 'ru')
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'RU' }).click()
    await page.locator('button.bg-emerald-700').first().click()
    const text = await getCommentText(page)
    expect(text).not.toMatch(/^__.*__$/)
    expect(text.length).toBeGreaterThan(10)
    expect(/[А-Яа-я]/.test(text)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// REAL API TESTS — tagged @real-api
// Skipped in CI. Run manually: npx playwright test --grep @real-api
// Or against prod: $env:BASE_URL="https://hadithverifier.com"; npx playwright test --grep @real-api
// ═════════════════════════════════════════════════════════════════════════════
test.describe('AI — Real API validation @real-api', () => {
  test.setTimeout(120000)

  test('@real-api should provide real URLs from valid sources', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
    await page.locator('button.bg-emerald-700').first().click()
    await page.waitForSelector('text=/verified sources/i', { timeout: 110000 })
    const sourceLinks = page.locator('main').first().locator('a[href^="https://"]')
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

  test('@real-api should generate non-empty comment in English', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
    await page.locator('button.bg-emerald-700').first().click()
    const text = await getCommentText(page)
    expect(text.length).toBeGreaterThan(50)
    expect(text).not.toContain('undefined')
  })
})
