# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hadith-verifier.spec.ts >> Language switching (CT-GenAI) >> should generate Russian comment when RU selected
- Location: tests\hadith-verifier.spec.ts:231:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: ☽
        - generic [ref=e6]:
          - heading "Hadith Verifier" [level=1] [ref=e7]
          - paragraph [ref=e8]: Hadith authentication · Dua corrector · EN · UZ · AR · RU · TJ
        - button "🇬🇧 English ▾" [ref=e10] [cursor=pointer]:
          - generic [ref=e11]: 🇬🇧
          - generic [ref=e12]: English
          - generic [ref=e13]: ▾
        - generic [ref=e14]:
          - generic [ref=e15]:
            - generic [ref=e16]: "0"
            - generic [ref=e17]: Checked
          - generic [ref=e18]:
            - generic [ref=e19]: "0"
            - generic [ref=e20]: Flagged
          - generic [ref=e21]:
            - generic [ref=e22]: "0"
            - generic [ref=e23]: Authentic
    - main [ref=e24]:
      - generic [ref=e25]:
        - button "Analyze post" [ref=e26] [cursor=pointer]
        - button "Dua corrector" [ref=e27] [cursor=pointer]
        - button "Sources" [ref=e28] [cursor=pointer]
        - button "Admin queue" [ref=e29] [cursor=pointer]
      - generic [ref=e31]:
        - generic [ref=e32]:
          - button "Paste text" [ref=e33] [cursor=pointer]
          - button "Upload screenshot" [ref=e34] [cursor=pointer]
        - generic [ref=e35]: Paste post content
        - textbox "Paste Facebook, Instagram, or WhatsApp post text — any language (Uzbek, Arabic, Russian, English...)" [ref=e36]: "URGENT SHARE: Prophet ﷺ said whoever reads this dua 7 times and shares with 10 people tonight, Allah will forgive ALL their sins and open the gates of Jannah. Don't break the chain! Share NOW! 🕌"
        - generic [ref=e38] [cursor=pointer]: Or drag & drop a screenshot · Click to browse
        - generic [ref=e39]:
          - generic [ref=e40]: "Try:"
          - button "Fabricated (Uzbek)" [ref=e41] [cursor=pointer]
          - button "Chain message" [ref=e42] [cursor=pointer]
          - button "Authentic" [ref=e43] [cursor=pointer]
        - generic [ref=e44]:
          - button "Analyzing..." [disabled] [ref=e45]: Analyzing...
          - button "Clear" [ref=e47] [cursor=pointer]
          - generic [ref=e48]:
            - generic [ref=e49]: "Reply in:"
            - button "EN" [ref=e50] [cursor=pointer]
            - button "UZ" [ref=e51] [cursor=pointer]
            - button "AR" [ref=e52] [cursor=pointer]
            - button "RU" [ref=e53] [cursor=pointer]
            - button "TJ" [ref=e54] [cursor=pointer]
  - alert [ref=e55]
```

# Test source

```ts
  138 |     await page.locator('button.bg-emerald-700').first().click()
  139 |     await page.waitForSelector('text=/red flags/i', { timeout: 60000 })
  140 |     await expect(page.getByText(/red flags/i)).toBeVisible()
  141 |   })
  142 | 
  143 |   test('should provide authentic alternative', async ({ page }) => {
  144 |     await page.goto('/')
  145 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  146 |     await page.locator('button.bg-emerald-700').first().click()
  147 |     await page.waitForSelector('text=/authentic scholarship/i', { timeout: 60000 })
  148 |     await expect(page.getByText(/authentic scholarship/i)).toBeVisible()
  149 |   })
  150 | 
  151 |   test('should provide source references', async ({ page }) => {
  152 |     await page.goto('/')
  153 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
  154 |     await page.locator('button.bg-emerald-700').first().click()
  155 |     await page.waitForSelector('text=/verified sources/i', { timeout: 90000 })
  156 |     await expect(page.getByText(/verified sources/i)).toBeVisible()
  157 |   })
  158 | })
  159 | 
  160 | test.describe('AI — Hallucination detection (CT-GenAI)', () => {
  161 |   test.setTimeout(120000)
  162 | 
  163 |   test('should provide real URLs from valid sources', async ({ page }) => {
  164 |     await page.goto('/')
  165 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
  166 |     await page.locator('button.bg-emerald-700').first().click()
  167 |     await page.waitForSelector('a[href^="https://"]', { timeout: 90000 })
  168 |     const links = page.locator('a[href^="https://"]')
  169 |     expect(await links.count()).toBeGreaterThan(0)
  170 |     const href = await links.first().getAttribute('href')
  171 |     expect(VALID_SOURCE_DOMAINS.some(d => href?.includes(d))).toBe(true)
  172 |   })
  173 | 
  174 |   test('should generate non-empty comment', async ({ page }) => {
  175 |     await page.goto('/')
  176 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  177 |     await page.locator('button.bg-emerald-700').first().click()
  178 |     await page.waitForSelector('.bg-gray-50.rounded-lg', { timeout: 90000 })
  179 |     const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
  180 |     expect(text?.length).toBeGreaterThan(50)
  181 |     expect(text).not.toContain('undefined')
  182 |   })
  183 | })
  184 | 
  185 | test.describe('Language switching (CT-GenAI)', () => {
  186 |   test.setTimeout(120000)
  187 | 
  188 |   test('should generate Uzbek comment when UZ selected', async ({ page }) => {
  189 |     test.setTimeout(120000)
  190 |     await page.goto('/')
  191 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
  192 |     await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'UZ' }).click()
  193 |     await page.locator('button.bg-emerald-700').first().click()
  194 |     // Wait for result container to appear — 'ready-to-post' text does not exist in UI (P033)
  195 |     await page.waitForSelector('.bg-gray-50.rounded-lg', { timeout: 90000 })
  196 |     await page.waitForFunction(
  197 |       () => document.querySelector('.bg-gray-50.rounded-lg')?.textContent?.trim().length ?? 0 > 20,
  198 |       { timeout: 90000 }
  199 |     )
  200 |     const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
  201 |     expect(
  202 |       text?.includes('Assalomu') ||
  203 |       text?.includes('alaykum') ||
  204 |       text?.includes('hadis') ||
  205 |       text?.includes('Alloh') ||
  206 |       text?.includes('rivoyat') ||
  207 |       text?.includes('uydirma') ||
  208 |       text?.includes('islom') ||
  209 |       text?.includes('manba') ||
  210 |       /[\u0400-\u04FF]/.test(text || '')
  211 |     ).toBe(true)
  212 |   })
  213 | 
  214 |   test('should generate Arabic comment when AR selected', async ({ page }) => {
  215 |     test.setTimeout(120000)
  216 |     await page.goto('/')
  217 |     // P029: use Arabic input to maximize Arabic output
  218 |     await page.locator('textarea').first().fill('من قرأ سورة الفاتحة سبع مرات قبل النوم كتب له ثواب سبعة آلاف يوم')
  219 |     await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'AR' }).click()
  220 |     await page.locator('button.bg-emerald-700').first().click()
  221 |     // Wait for result container to appear (P033)
  222 |     await page.waitForSelector('.bg-gray-50.rounded-lg', { timeout: 90000 })
  223 |     await page.waitForFunction(
  224 |       () => document.querySelector('.bg-gray-50.rounded-lg')?.textContent?.trim().length ?? 0 > 20,
  225 |       { timeout: 90000 }
  226 |     )
  227 |     const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
  228 |     expect(/[\u0600-\u06FF]/.test(text || '')).toBe(true)
  229 |   })
  230 | 
  231 |   test('should generate Russian comment when RU selected', async ({ page }) => {
  232 |     await page.goto('/')
  233 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  234 |     await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'RU' }).click()
  235 |     await page.locator('button.bg-emerald-700').first().click()
  236 |     await page.waitForSelector('.bg-gray-50.rounded-lg', { timeout: 90000 })
  237 |     const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
> 238 |     expect(/[\u0400-\u04FF]/.test(text || '')).toBe(true)
      |                                                ^ Error: expect(received).toBe(expected) // Object.is equality
  239 |   })
  240 | })
  241 | 
  242 | test.describe('Copy comment functionality', () => {
  243 |   test.setTimeout(90000)
  244 | 
  245 |   test('should show copy button after analysis', async ({ page }) => {
  246 |     await page.goto('/')
  247 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  248 |     await page.locator('button.bg-emerald-700').first().click()
  249 |     await page.waitForSelector('.bg-gray-50.rounded-lg', { timeout: 90000 })
  250 |     await expect(page.getByRole('button', { name: /copy comment/i })).toBeVisible()
  251 |   })
  252 | })
  253 | 
  254 | test.describe('Stats counter', () => {
  255 |   test.setTimeout(90000)
  256 | 
  257 |   test('should increment checked count after analysis', async ({ page }) => {
  258 |     // Skip in CI — requires successful API call which may be rate limited
  259 |     if (process.env.CI) {
  260 |       test.skip()
  261 |       return
  262 |     }
  263 |     await page.goto('/')
  264 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  265 |     await page.locator('button.bg-emerald-700').first().click()
  266 |     await page.waitForSelector('.bg-red-50, .bg-amber-50, .bg-green-50', { timeout: 60000 })
  267 |     const num = await page.locator('text=Checked').locator('..').locator('div').first().textContent()
  268 |     expect(Number(num)).toBeGreaterThan(0)
  269 |   })
  270 | })
  271 | 
  272 | test.describe('Sources tab', () => {
  273 |   test('should show all three tiers', async ({ page }) => {
  274 |     await page.goto('/')
  275 |     // Click the Sources tab button
  276 |     await page.locator('button').filter({ hasText: /^Sources$/ }).click()
  277 |     await expect(page.getByText(/tier 1/i).first()).toBeVisible()
  278 |     await expect(page.getByText(/tier 2/i).first()).toBeVisible()
  279 |     await expect(page.getByText(/tier 3/i).first()).toBeVisible()
  280 |   })
  281 | 
  282 |   test('should show Dorar.net', async ({ page }) => {
  283 |     await page.goto('/')
  284 |     await page.locator('button').filter({ hasText: /^Sources$/ }).click()
  285 |     await expect(page.getByText(/dorar/i).first()).toBeVisible()
  286 |   })
  287 | 
  288 |   test('should show clickable links', async ({ page }) => {
  289 |     await page.goto('/')
  290 |     await page.locator('button').filter({ hasText: /^Sources$/ }).click()
  291 |     expect(await page.locator('a[href^="https://"]').count()).toBeGreaterThan(5)
  292 |   })
  293 | })
  294 | 
  295 | test.describe('Admin queue tab', () => {
  296 |   test('should load without errors', async ({ page }) => {
  297 |     await page.goto('/')
  298 |     await page.locator('button').filter({ hasText: /admin queue/i }).click()
  299 |     await expect(page.getByText(/flagged posts queue/i)).toBeVisible()
  300 |   })
  301 | })
  302 | 
  303 | test.describe('Dua corrector tab', () => {
  304 |   test('should show dua corrector tab', async ({ page }) => {
  305 |     await page.goto('/')
  306 |     await expect(page.locator('button').filter({ hasText: /dua corrector/i })).toBeVisible()
  307 |   })
  308 | 
  309 |   test('should load dua corrector interface', async ({ page }) => {
  310 |     await page.goto('/')
  311 |     await page.locator('button').filter({ hasText: /dua corrector/i }).click()
  312 |     await expect(page.getByRole('button', { name: /check dua/i })).toBeVisible()
  313 |   })
  314 | 
  315 |   test('should load wrong order example', async ({ page }) => {
  316 |     await page.goto('/')
  317 |     await page.locator('button').filter({ hasText: /dua corrector/i }).click()
  318 |     await page.getByRole('button', { name: /wrong order/i }).click()
  319 |     expect((await page.locator('textarea').first().inputValue()).length).toBeGreaterThan(10)
  320 |   })
  321 | })
  322 | 
  323 | test.describe('Mobile responsiveness', () => {
  324 |   test('should be usable on mobile', async ({ page }) => {
  325 |     await page.setViewportSize({ width: 390, height: 844 })
  326 |     await page.goto('/')
  327 |     await expect(page.getByText('Hadith Verifier').first()).toBeVisible()
  328 |     await expect(page.locator('textarea').first()).toBeVisible()
  329 |   })
  330 | })
  331 | 
  332 | test.describe('Clear functionality', () => {
  333 |   test('should clear textarea', async ({ page }) => {
  334 |     await page.goto('/')
  335 |     await page.locator('textarea').first().fill('Some test text')
  336 |     await page.getByRole('button', { name: 'Clear' }).first().click()
  337 |     expect(await page.locator('textarea').first().inputValue()).toBe('')
  338 |   })
```