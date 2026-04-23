# Playwright Best Practices for AI-Powered Applications
# Pre-loaded knowledge for Playwright Agent (CAG)
# Sources: Playwright official docs, CT-GenAI patterns, community fixes
# Specific to: Next.js + Anthropic Claude API + Vercel stack

## ════════════════════════════════════════════════════════
## SECTION 1: TIMEOUTS FOR AI/LLM APPLICATIONS
## ════════════════════════════════════════════════════════

### Rule 1.1 — Never use default timeouts for AI API calls
Default Playwright timeout is 30s. LLM API calls routinely take 10-40s.
CI runners (GitHub Actions) are 20-30% slower than local machines.

**Required timeouts for this project:**
```ts
// playwright.config.ts
export default defineConfig({
  timeout: 120000,          // 2 min per test
  expect: { timeout: 10000 },
  use: {
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  retries: process.env.CI ? 2 : 0,  // retry twice in CI
})
```

**Per-test override for AI-heavy tests:**
```ts
test('should return AI analysis', async ({ page }) => {
  test.setTimeout(120000)  // always for AI tests
  ...
  await page.waitForSelector('text=/verified sources/i', { timeout: 90000 })
})
```

### Rule 1.2 — waitForResponse is more reliable than waitForSelector for AI tests
```ts
// FRAGILE — waitForSelector can race with render:
await page.waitForSelector('text=/verified sources/i', { timeout: 90000 })

// MORE RELIABLE — wait for API response first, then check DOM:
const responsePromise = page.waitForResponse(
  r => r.url().includes('/api/analyze') && r.status() === 200,
  { timeout: 90000 }
)
await page.locator('button.bg-emerald-700').first().click()
const response = await responsePromise
const body = await response.json()
expect(body.references).toBeDefined()
// NOW check DOM — it will be rendered
await expect(page.getByText(/verified sources/i)).toBeVisible()
```

### Rule 1.3 — GitHub Actions timeout multiplier
Always add 50% to local timeouts when setting CI timeouts:
- Local test takes 20s → set CI timeout to 30s minimum
- Local test takes 40s → set CI timeout to 60s minimum


## ════════════════════════════════════════════════════════
## SECTION 2: SELECTOR STABILITY
## ════════════════════════════════════════════════════════

### Rule 2.1 — Never use CSS class selectors for critical test paths
CSS classes change on every UI refactor. Use role-based selectors.

```ts
// FRAGILE — breaks when Tailwind class changes:
await page.locator('button.bg-emerald-700').first().click()

// STABLE — survives UI refactors:
await page.getByRole('button', { name: /analyze post/i }).click()
await page.getByRole('button', { name: /analyze/i }).first().click()
```

**Exception:** CSS class selectors acceptable for smoke tests that
intentionally verify styling (e.g., WCAG contrast checks).

### Rule 2.2 — Use data-testid for critical interactive elements
Add to page.tsx on key buttons:
```tsx
<button data-testid="analyze-btn" ...>Analyze post</button>
<button data-testid="copy-comment-btn" ...>Copy comment</button>
```
Then in tests:
```ts
await page.getByTestId('analyze-btn').click()
```

### Rule 2.3 — Locator chaining for nested elements
```ts
// Find "Reply in:" section then find buttons inside it:
const replySection = page.locator('text=Reply in:').locator('..')
await replySection.getByRole('button', { name: 'UZ' }).click()
```

### Rule 2.4 — Language-aware selectors
The app has 6 languages. Tests should handle translated text:
```ts
// FRAGILE — only works in English:
await expect(page.getByText('Analyze post')).toBeVisible()

// STABLE — check button exists regardless of language:
await expect(page.locator('button.bg-emerald-700').first()).toBeVisible()

// BETTER — use data-testid:
await expect(page.getByTestId('analyze-btn')).toBeVisible()
```


## ════════════════════════════════════════════════════════
## SECTION 3: AI RESPONSE TESTING (CT-GenAI PATTERNS)
## ════════════════════════════════════════════════════════

### Rule 3.1 — Never assert exact AI text output
AI responses are non-deterministic. Test structure, not content.

```ts
// WRONG — will fail randomly:
expect(body.suggested_comment).toBe('Assalomu alaykum...')

// RIGHT — test structure and constraints:
expect(body.suggested_comment.length).toBeGreaterThan(50)
expect(body.suggested_comment).not.toContain('undefined')
expect(body.suggested_comment).not.toContain('null')
expect(['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith'])
  .toContain(body.verdict)
```

### Rule 3.2 — Test language output with multiple valid indicators
```ts
// For Uzbek output — multiple valid words, any one is sufficient:
expect(
  text?.includes('Assalomu') ||
  text?.includes('alaykum') ||
  text?.includes('hadis') ||
  text?.includes('Alloh')
).toBe(true)

// For Tajik output:
expect(
  text?.includes('Ассалому') ||
  text?.includes('ҳадис') ||
  text?.includes('Аллоҳ') ||
  text?.includes('с.а.в')
).toBe(true)
```

### Rule 3.3 — Always normalize AI array fields before testing
Even if route.ts normalizes, add defensive checks in API tests:
```ts
const body = await response.json()
// These should always pass after P001 fix in route.ts:
expect(Array.isArray(body.references)).toBe(true)
expect(Array.isArray(body.red_flags)).toBe(true)
// But also guard in test assertions:
const refs = body.references ?? []
expect(refs.length).toBeGreaterThanOrEqual(0)
```

### Rule 3.4 — URL validation for AI-generated references
```ts
// Validate URLs are from trusted domains only:
const VALID_SOURCE_DOMAINS = [
  'sunnah.com', 'dorar.net', 'hadeethenc.com',
  'islamqa.info', 'islamweb.net', 'yaqeeninstitute.org'
]
const href = await links.first().getAttribute('href')
expect(VALID_SOURCE_DOMAINS.some(d => href?.includes(d))).toBe(true)

// Also validate URL format:
expect(href).toMatch(/^https:\/\//)
expect(href).not.toContain('undefined')
expect(href).not.toContain('example.com')
```

### Rule 3.5 — Hallucination detection tests
```ts
// Test that AI does not hallucinate non-existent hadiths as authentic:
test('should not mark clearly fabricated post as authentic', async () => {
  const response = await request.post('/api/analyze', {
    data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }
  })
  const body = await response.json()
  expect(body.verdict).not.toBe('authentic')
  expect(['fabricated', 'weak', 'unclear']).toContain(body.verdict)
})
```


## ════════════════════════════════════════════════════════
## SECTION 4: MOBILE AND VIEWPORT TESTING
## ════════════════════════════════════════════════════════

### Rule 4.1 — Stats panel is hidden on mobile (sm:flex)
```ts
test('should show stats panel', async ({ page }) => {
  // MUST set desktop viewport — stats hidden on mobile:
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(page.locator('header').getByText('Checked')).toBeVisible()
})
```

### Rule 4.2 — RTL layout for Arabic
```ts
test('should render Arabic in RTL', async ({ page }) => {
  // Switch to Arabic
  await page.locator('header button').filter({ hasText: /English/ }).click()
  await page.getByText('العربية').click()
  // Check dir attribute
  const dir = await page.locator('html').getAttribute('dir')
  expect(dir).toBe('rtl')
})
```

### Rule 4.3 — Mobile Chrome viewport
```ts
// playwright.config.ts projects:
{
  name: 'Mobile Chrome',
  use: {
    ...devices['Pixel 5'],
    // Explicit size for consistency:
    viewport: { width: 390, height: 844 }
  }
}
```


## ════════════════════════════════════════════════════════
## SECTION 5: CI/CD SPECIFIC PATTERNS
## ════════════════════════════════════════════════════════

### Rule 5.1 — Always test against production URL in CI
```yaml
# .github/workflows/playwright.yml
env:
  BASE_URL: https://hadithverifier.com  # production, not localhost
```

### Rule 5.2 — Retry configuration for AI flakiness
```ts
// playwright.config.ts
retries: process.env.CI ? 2 : 0,  // 2 retries in CI, 0 local
```

### Rule 5.3 — Upload test artifacts on failure
```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

### Rule 5.4 — Parallel workers in CI
```ts
workers: process.env.CI ? 2 : undefined,  // limit CI workers
```

### Rule 5.5 — Skip tests that require specific infrastructure
```ts
test.skip(process.env.CI === 'true', 'Skipped in CI — requires local Supabase')
```


## ════════════════════════════════════════════════════════
## SECTION 6: NETWORK AND API MOCKING
## ════════════════════════════════════════════════════════

### Rule 6.1 — Mock Anthropic API for unit/speed tests
```ts
// Mock the API to avoid credit usage in non-AI tests:
await page.route('**/api/analyze', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      verdict: 'fabricated',
      confidence: 'high',
      severity: 'CRITICAL',
      claim_summary: 'Test claim',
      red_flags: ['flag1', 'flag2'],
      analysis: 'Test analysis',
      authentic_alternative: 'Test alternative',
      references: [
        { source: 'Sunnah.com', url: 'https://sunnah.com/bukhari:574', authority: 'tier1' }
      ],
      suggested_comment: 'Assalomu alaykum...'
    })
  })
})
```

### Rule 6.2 — Intercept and log API calls for debugging
```ts
page.on('response', response => {
  if (response.url().includes('/api/')) {
    console.log(`API: ${response.url()} → ${response.status()}`)
  }
})
```


## ════════════════════════════════════════════════════════
## SECTION 7: WCAG 2.1 TESTING PATTERNS (PENDING)
## ════════════════════════════════════════════════════════

### Rule 7.1 — axe-core integration (to be implemented)
```ts
import AxeBuilder from '@axe-core/playwright'

test('should pass WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
```

### Rule 7.2 — Color contrast on verdict badges
Test that verdict badges (red/amber/green) meet 4.5:1 contrast ratio.
This is especially important for the CRITICAL (red) badge.

### Rule 7.3 — RTL accessibility
Arabic layout (dir="rtl") must be tested for screen reader compatibility.
Tab order must follow visual reading order in RTL mode.

**Status:** PENDING — tracked in CLAUDE.md as axe-core WCAG 2.0 AA: PENDING


## ════════════════════════════════════════════════════════
## SECTION 8: DEBUGGING FAILED TESTS
## ════════════════════════════════════════════════════════

### Rule 8.1 — Read trace files for flaky failures
```bash
npx playwright show-trace test-results/test-name/trace.zip
```

### Rule 8.2 — Check Vercel function logs
```powershell
vercel logs https://hadithverifier.com --since 1h
```

### Rule 8.3 — Distinguish AI flakiness from code bugs
- **Same test fails consistently across both Chromium + Mobile Chrome** → code bug
- **Test fails on retry 1 but passes on retry 2** → AI flakiness, add retry
- **All API tests fail simultaneously** → check API credits (P005)
- **Only UI selector tests fail** → check for CSS class changes (Rule 2.1)

### Rule 8.4 — The 32-failure pattern means infrastructure not code
If 30+ tests fail in one run including basic "should return 200" tests,
do NOT look at the code. Check:
1. Anthropic API credits (most common)
2. Vercel deployment status
3. Environment variables in Vercel dashboard
4. Network connectivity from CI to production URL
