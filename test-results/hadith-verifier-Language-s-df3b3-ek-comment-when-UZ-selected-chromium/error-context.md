# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hadith-verifier.spec.ts >> Language switching (CT-GenAI) >> should generate Uzbek comment when UZ selected
- Location: tests\hadith-verifier.spec.ts:188:7

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
          - paragraph [ref=e8]: Hadith authentication · Dua corrector · EN · UZ · AR · RU
        - button "🇬🇧 English ▾" [ref=e10] [cursor=pointer]:
          - generic [ref=e11]: 🇬🇧
          - generic [ref=e12]: English
          - generic [ref=e13]: ▾
        - generic [ref=e14]:
          - generic [ref=e15]:
            - generic [ref=e16]: "1"
            - generic [ref=e17]: Checked
          - generic [ref=e18]:
            - generic [ref=e19]: "1"
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
      - generic [ref=e30]:
        - generic [ref=e31]:
          - generic [ref=e32]:
            - button "Paste text" [ref=e33] [cursor=pointer]
            - button "Upload screenshot" [ref=e34] [cursor=pointer]
          - generic [ref=e35]: Paste post content
          - textbox "Paste Facebook, Instagram, or WhatsApp post text — any language (Uzbek, Arabic, Russian, English...)" [ref=e36]: "Мусулмонлар диққат билан эшитинг Расул (с.а.в) айтдилар: 1. Ким ухлашдан олдин 4 марта Сура Фотиҳа ўқиса, 4000 кун садақа қилган савоби ёзилади. 2. Ким ухлашдан олдин 3 марта Сура Ихлос ўқиса, бир марта Қуръонни хатм қилган савобини олади. Бу видеони улашиб, бошқаларга ҳам билиш имконини яратиб беринг."
          - generic [ref=e38] [cursor=pointer]: Or drag & drop a screenshot · Click to browse
          - generic [ref=e39]:
            - generic [ref=e40]: "Try:"
            - button "Fabricated (Uzbek)" [ref=e41] [cursor=pointer]
            - button "Chain message" [ref=e42] [cursor=pointer]
            - button "Authentic" [ref=e43] [cursor=pointer]
          - generic [ref=e44]:
            - button "Analyze post" [ref=e45] [cursor=pointer]
            - button "Clear" [ref=e46] [cursor=pointer]
            - generic [ref=e47]:
              - generic [ref=e48]: "Reply in:"
              - button "EN" [ref=e49] [cursor=pointer]
              - button "UZ" [ref=e50] [cursor=pointer]
              - button "AR" [ref=e51] [cursor=pointer]
              - button "RU" [ref=e52] [cursor=pointer]
        - generic [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]: Text extracted from screenshot
            - generic [ref=e56]: "Мусулмонлар диққат билан эшитинг Расул (с.а.в) айтдилар: 1. Ким ухлашдан олдин 4 марта Сура Фотиҳа ўқиса, 4000 кун садақа қилган савоби ёзилади. 2. Ким ухлашдан олдин 3 марта Сура Ихлос ўқиса, бир марта Қуръонни хатм қилган савобини олади. Бу видеони улашиб, бошқаларга ҳам билиш имконини яратиб беринг."
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]: Fabricated hadith
              - generic [ref=e60]: high confidence
            - generic [ref=e61]: Пайғамбар (с.а.в) ухлашдан олдин Фотиҳани 4 марта ва Ихлосни 3 марта ўқишнинг алоҳида савоблари ҳақида айтган деб даъво қилинмоқда
            - generic [ref=e62]: Бу хадислар сохта бўлиб, ишонарли хадис китобларида мавжуд эмас. Аниқ рақамли савоб қийматларини кўрсатиш сохта хадисларнинг аломатидир. Хақиқий хадисларда одатда ундай аниқ рақамлар келтирилмайди.
            - generic [ref=e63]:
              - generic [ref=e64]: Red flags detected
              - generic [ref=e65]:
                - generic [ref=e66]: ◆
                - generic [ref=e67]: Аниқ рақамли савоб қийматлари (4000 кун садақа) берилган
              - generic [ref=e68]:
                - generic [ref=e69]: ◆
                - generic [ref=e70]: Ушбу хадислар ишонарли ҳадис китобларида топилмайди
              - generic [ref=e71]:
                - generic [ref=e72]: ◆
                - generic [ref=e73]: Савобнинг аниқ миқдорини билдириш одатда сохта хадисларнинг белгиси
              - generic [ref=e74]:
                - generic [ref=e75]: ◆
                - generic [ref=e76]: Ушбу маълумотлар классик ҳадис манбаларида мавжуд эмас
          - generic [ref=e77]:
            - generic [ref=e78]: Authentic scholarship says
            - generic [ref=e79]: Хақиқий хадисларда ухлашдан олдин зикр ва дуо ўқишнинг фойдалари келтирилган, лекин аниқ савоб миқдорлари билан эмас. Масалан, Курсий оятини ўқиш тавсия этилган.
            - generic [ref=e80]: Verified sources
            - generic [ref=e83]:
              - text: Sunnah.comtier1
              - generic [ref=e84]: Ухлашдан олдин ўқиладиган дуолар ҳақидаги хақиқий хадислар
              - link "https://sunnah.com/bukhari:6320" [ref=e85] [cursor=pointer]:
                - /url: https://sunnah.com/bukhari:6320
          - generic [ref=e86]:
            - generic [ref=e87]: Ready-to-post comment (UZ)
            - generic [ref=e88]: Ассалому алайкум. Афсуски, бу хадислар сохта бўлиб, ишонарли ҳадис китобларида мавжуд эмас. Хақиқий хадисларда ухлашдан олдин турли дуолар ўқиш тавсия этилган, лекин аниқ рақамли савобларсиз. Илтимос, хадисларни текширишда эҳтиёт бўлинг ва Sunnah.com каби ишонарли манбаларга мурожаат қилинг. Аллоҳ барчамизни тўғри йўлда юритсин. Омин.
            - generic [ref=e89]:
              - button "Copy comment" [ref=e90] [cursor=pointer]
              - button "View in admin queue →" [ref=e91] [cursor=pointer]
  - alert [ref=e92]
```

# Test source

```ts
  105 |   test('should detect chain message as fabricated or weak', async ({ page }) => {
  106 |     await page.goto('/')
  107 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  108 |     await page.locator('button.bg-emerald-700').first().click()
  109 |     await page.waitForSelector('.bg-red-50, .bg-amber-50', { timeout: 60000 })
  110 |     const text = await page.locator('.bg-red-50, .bg-amber-50').first().textContent()
  111 |     expect(text?.toLowerCase().includes('fabricated') || text?.toLowerCase().includes('weak')).toBe(true)
  112 |   })
  113 | })
  114 | 
  115 | test.describe('AI — Output quality (CT-GenAI)', () => {
  116 |   test.setTimeout(90000)
  117 | 
  118 |   test('should return a verdict box', async ({ page }) => {
  119 |     await page.goto('/')
  120 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  121 |     await page.locator('button.bg-emerald-700').first().click()
  122 |     await page.waitForSelector('.bg-red-50, .bg-amber-50, .bg-green-50', { timeout: 60000 })
  123 |     await expect(page.locator('.bg-red-50, .bg-amber-50, .bg-green-50').first()).toBeVisible()
  124 |   })
  125 | 
  126 |   test('should show confidence level', async ({ page }) => {
  127 |     await page.goto('/')
  128 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
  129 |     await page.locator('button.bg-emerald-700').first().click()
  130 |     await page.waitForSelector('text=/confidence/i', { timeout: 60000 })
  131 |     const text = await page.getByText(/confidence/i).first().textContent()
  132 |     expect(text?.includes('high') || text?.includes('medium') || text?.includes('low')).toBe(true)
  133 |   })
  134 | 
  135 |   test('should show red flags', async ({ page }) => {
  136 |     await page.goto('/')
  137 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
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
  155 |     await page.waitForSelector('text=/verified sources/i', { timeout: 60000 })
  156 |     await expect(page.getByText(/verified sources/i)).toBeVisible()
  157 |   })
  158 | })
  159 | 
  160 | test.describe('AI — Hallucination detection (CT-GenAI)', () => {
  161 |   test.setTimeout(90000)
  162 | 
  163 |   test('should provide real URLs from valid sources', async ({ page }) => {
  164 |     await page.goto('/')
  165 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
  166 |     await page.locator('button.bg-emerald-700').first().click()
  167 |     await page.waitForSelector('a[href^="https://"]', { timeout: 60000 })
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
  178 |     await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })
  179 |     const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
  180 |     expect(text?.length).toBeGreaterThan(50)
  181 |     expect(text).not.toContain('undefined')
  182 |   })
  183 | })
  184 | 
  185 | test.describe('Language switching (CT-GenAI)', () => {
  186 |   test.setTimeout(90000)
  187 | 
  188 |   test('should generate Uzbek comment when UZ selected', async ({ page }) => {
  189 |     await page.goto('/')
  190 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.uzbek)
  191 |     // Click UZ reply button - use locator that finds the pill buttons near "Reply in:"
  192 |     await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'UZ' }).click()
  193 |     await page.locator('button.bg-emerald-700').first().click()
  194 |     await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })
  195 |     const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
  196 |     expect(
  197 |       text?.includes('Assalomu') ||
  198 |       text?.includes('alaykum') ||
  199 |       text?.includes('Alloh') ||
  200 |       text?.includes('hadis') ||
  201 |       text?.includes('rivoyat') ||
  202 |       text?.includes('sahih') ||
  203 |       text?.includes('islom') ||
  204 |       text?.toLowerCase().includes('assalamu')
> 205 |     ).toBe(true)
      |       ^ Error: expect(received).toBe(expected) // Object.is equality
  206 |   })
  207 | 
  208 |   test('should generate Arabic comment when AR selected', async ({ page }) => {
  209 |     await page.goto('/')
  210 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  211 |     await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'AR' }).click()
  212 |     await page.locator('button.bg-emerald-700').first().click()
  213 |     await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })
  214 |     const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
  215 |     expect(/[\u0600-\u06FF]/.test(text || '')).toBe(true)
  216 |   })
  217 | 
  218 |   test('should generate Russian comment when RU selected', async ({ page }) => {
  219 |     await page.goto('/')
  220 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  221 |     await page.locator('text=Reply in:').locator('..').getByRole('button', { name: 'RU' }).click()
  222 |     await page.locator('button.bg-emerald-700').first().click()
  223 |     await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })
  224 |     const text = await page.locator('.bg-gray-50.rounded-lg').last().textContent()
  225 |     expect(/[\u0400-\u04FF]/.test(text || '')).toBe(true)
  226 |   })
  227 | })
  228 | 
  229 | test.describe('Copy comment functionality', () => {
  230 |   test.setTimeout(90000)
  231 | 
  232 |   test('should show copy button after analysis', async ({ page }) => {
  233 |     await page.goto('/')
  234 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  235 |     await page.locator('button.bg-emerald-700').first().click()
  236 |     await page.waitForSelector('text=/copy comment/i', { timeout: 60000 })
  237 |     await expect(page.getByRole('button', { name: /copy comment/i })).toBeVisible()
  238 |   })
  239 | })
  240 | 
  241 | test.describe('Stats counter', () => {
  242 |   test.setTimeout(90000)
  243 | 
  244 |   test('should increment checked count after analysis', async ({ page }) => {
  245 |     await page.goto('/')
  246 |     await page.locator('textarea').first().fill(FABRICATED_POSTS.chain_message)
  247 |     await page.locator('button.bg-emerald-700').first().click()
  248 |     await page.waitForSelector('.bg-red-50, .bg-amber-50, .bg-green-50', { timeout: 60000 })
  249 |     const num = await page.locator('text=Checked').locator('..').locator('div').first().textContent()
  250 |     expect(Number(num)).toBeGreaterThan(0)
  251 |   })
  252 | })
  253 | 
  254 | test.describe('Sources tab', () => {
  255 |   test('should show all three tiers', async ({ page }) => {
  256 |     await page.goto('/')
  257 |     // Click the Sources tab button
  258 |     await page.locator('button').filter({ hasText: /^Sources$/ }).click()
  259 |     await expect(page.getByText(/tier 1/i).first()).toBeVisible()
  260 |     await expect(page.getByText(/tier 2/i).first()).toBeVisible()
  261 |     await expect(page.getByText(/tier 3/i).first()).toBeVisible()
  262 |   })
  263 | 
  264 |   test('should show Dorar.net', async ({ page }) => {
  265 |     await page.goto('/')
  266 |     await page.locator('button').filter({ hasText: /^Sources$/ }).click()
  267 |     await expect(page.getByText(/dorar/i).first()).toBeVisible()
  268 |   })
  269 | 
  270 |   test('should show clickable links', async ({ page }) => {
  271 |     await page.goto('/')
  272 |     await page.locator('button').filter({ hasText: /^Sources$/ }).click()
  273 |     expect(await page.locator('a[href^="https://"]').count()).toBeGreaterThan(5)
  274 |   })
  275 | })
  276 | 
  277 | test.describe('Admin queue tab', () => {
  278 |   test('should load without errors', async ({ page }) => {
  279 |     await page.goto('/')
  280 |     await page.locator('button').filter({ hasText: /admin queue/i }).click()
  281 |     await expect(page.getByText(/flagged posts queue/i)).toBeVisible()
  282 |   })
  283 | })
  284 | 
  285 | test.describe('Dua corrector tab', () => {
  286 |   test('should show dua corrector tab', async ({ page }) => {
  287 |     await page.goto('/')
  288 |     await expect(page.locator('button').filter({ hasText: /dua corrector/i })).toBeVisible()
  289 |   })
  290 | 
  291 |   test('should load dua corrector interface', async ({ page }) => {
  292 |     await page.goto('/')
  293 |     await page.locator('button').filter({ hasText: /dua corrector/i }).click()
  294 |     await expect(page.getByRole('button', { name: /check dua/i })).toBeVisible()
  295 |   })
  296 | 
  297 |   test('should load wrong order example', async ({ page }) => {
  298 |     await page.goto('/')
  299 |     await page.locator('button').filter({ hasText: /dua corrector/i }).click()
  300 |     await page.getByRole('button', { name: /wrong order/i }).click()
  301 |     expect((await page.locator('textarea').first().inputValue()).length).toBeGreaterThan(10)
  302 |   })
  303 | })
  304 | 
  305 | test.describe('Mobile responsiveness', () => {
```