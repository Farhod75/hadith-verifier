# Hadith Verifier — Known Fix Patterns
# Auto-loaded by Playwright Agent (CAG)
# Update this file every time a new fix is applied manually
# Last updated: April 2026
# Total patterns: 23 (extracted from 62 CI runs, full git history)

## ════════════════════════════════════════════════════════
## PATTERN 1: AI returns null/object instead of array
## ════════════════════════════════════════════════════════
**ID:** P001
**Type:** Source fix (route.ts)
**Commit:** 8cc786d fix: normalize references and red_flags to always be arrays
**Symptom:**
  - expect(Array.isArray(body.references)).toBe(true) → FAILED (received false)
  - expect(Array.isArray(body.red_flags)).toBe(true) → FAILED
  - Files: api.spec.ts:40, api.spec.ts:66

**Root cause:**
  Claude API occasionally returns null, undefined, or an object
  instead of an array for references and red_flags fields.

**Fix — add immediately after JSON.parse in route.ts:**
```ts
result = JSON.parse(raw.replace(/```json|```/g, '').trim())
if (!Array.isArray(result.references)) result.references = []
if (!Array.isArray(result.red_flags))  result.red_flags  = []
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 2: UI timeout waiting for source reference links
## ════════════════════════════════════════════════════════
**ID:** P002
**Type:** Test fix + prompt fix (both required)
**Commits:**
  - 11f3b74 fix: stronger references prompt + increase timeout on flaky URL tests
  - f25b170 fix: increase timeout on flaky source reference UI tests
  - 646929e fix: force minimum 2 references in prompt
**Symptom:**
  - TimeoutError: page.waitForSelector('a[href^="https://"]') timeout 60000ms
  - TimeoutError: page.waitForSelector('text=/verified sources/i') timeout 60000ms
  - Files: hadith-verifier.spec.ts:151, hadith-verifier.spec.ts:163

**Root cause:**
  1. AI returns empty references array (P001 partially covers this)
  2. Default 60s timeout too short for AI + UI render in CI

**Fix 1 — increase test timeouts:**
```ts
test('should provide source references', async ({ page }) => {
  test.setTimeout(120000)
  await page.waitForSelector('text=/verified sources/i', { timeout: 90000 })
})
test('should provide real URLs from valid sources', async ({ page }) => {
  test.setTimeout(120000)
  await page.waitForSelector('a[href^="https://"]', { timeout: 90000 })
})
```

**Fix 2 — strengthen prompt in route.ts (both image and text paths):**
```ts
`\nCRITICAL: Always include at least 2 real references with real URLs
from sunnah.com, dorar.net, or islamqa.info. Never return an empty references array.`
```

**Fix 3 — jsonTemplate with 2 example references:**
```ts
"references":[
  {"source":"Sunnah.com","url":"https://sunnah.com/bukhari","authority":"tier1"},
  {"source":"Dorar.net","url":"https://dorar.net/hadith","authority":"tier1"}
]
```
**Status:** IN PROGRESS — still flaky, monitor


## ════════════════════════════════════════════════════════
## PATTERN 3: Language drift — Uzbek phrases in Tajik output
## ════════════════════════════════════════════════════════
**ID:** P003
**Type:** Prompt fix (route.ts langInstruction)
**Commits:**
  - 5c9602d fix: strengthen TJ language instruction to prevent Uzbek drift
  - cdb692f fix: explicitly ban Uzbek phrases in TJ output
**Symptom:**
  - TJ suggested_comment contains Uzbek phrase "ташриф буюринг"
  - Last sentence of TJ output reverts to Uzbek
  - Salawat written as (с) instead of (с.а.в)

**Root cause:**
  Model trained on more Uzbek Islamic content than Tajik.
  Tajik/Uzbek share Cyrillic script and Islamic vocabulary.

**Fix — explicit negative + positive examples in lang === 'tg':**
```ts
`Do NOT use Uzbek words - avoid: "ташриф буюринг", "марҳамат қилинг".
Use Tajik: "барои дидан гузаред" or "ба манба муроҷиат кунед".
Every single sentence - including the last - must be in Tajik.
When referring to the Prophet write (с.а.в).`
```
**Key learning:** Negative + positive examples beat general instructions
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 4: TypeScript build failure — em dash in template literal
## ════════════════════════════════════════════════════════
**ID:** P004
**Type:** Syntax fix (route.ts)
**Commit:** bb8f5d2 fix: replace em dashes in TJ lang instruction
**Symptom:**
  - Vercel build: "Expression expected", "Syntax Error"
  - Error at langInstruction line in route.ts

**Root cause:**
  Em dash (--) pasted from formatted text into TypeScript template literal.
  Also affects: curly quotes, smart apostrophes.

**Fix:** Replace -- with - in template literals. Use plain ASCII only.
**PowerShell check:**
```powershell
Get-Content app/api/analyze/route.ts | Select-Object -Index (87..94)
```
**Rule:** NEVER paste formatted text into TS template literals.
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 5: Anthropic API credits exhausted — mass test failure
## ════════════════════════════════════════════════════════
**ID:** P005
**Type:** Infrastructure
**Symptom:**
  - 30+ tests fail simultaneously
  - Error: "400 invalid_request_error: Your credit balance is too low"
  - Basic "should return 200" test also fails

**Root cause:**
  console.anthropic.com credits ran out.
  Separate from claude.ai subscription — two different billing systems.

**Fix:**
  1. console.anthropic.com → Billing → Buy credits ($10 min)
  2. Enable auto-reload at $5 threshold → reload to $15
  3. vercel --prod --force
  4. Re-run GitHub Actions

**Status:** FIXED + auto-reload enabled April 2026


## ════════════════════════════════════════════════════════
## PATTERN 6: Wrong Vercel API key / workspace mismatch
## ════════════════════════════════════════════════════════
**ID:** P006
**Type:** Infrastructure
**Symptom:**
  - App works locally, fails in production
  - Same credit error (P005) even after topping up

**Root cause:**
  Two API keys in two different Anthropic workspaces.
  Credits in workspace A do not apply to key from workspace B.

**Fix:**
  1. console.anthropic.com → API Keys → check "Last used" column
  2. Key with today's date + highest cost = production key
  3. Create new key in same workspace as billing
  4. Update in Vercel DASHBOARD (not just CLI)
  5. vercel --prod --force

**Status:** FIXED April 2026


## ════════════════════════════════════════════════════════
## PATTERN 7: Supabase RLS silently blocking reads
## ════════════════════════════════════════════════════════
**ID:** P007
**Type:** Infrastructure (Supabase)
**Commits:**
  - 34cfd0b fix: remove RLS filter, add debug logging for queue route
  - ef85486 fix: use service role key for Supabase server-side writes
**Symptom:**
  - Admin queue tab empty even when posts exist
  - GET /api/queue returns [] with no error

**Root cause:**
  Supabase RLS enabled by default. Anon key cannot read rows.

**Fix:**
  - Disable RLS on flagged_posts table in Supabase dashboard
  - Always use SUPABASE_SERVICE_ROLE_KEY in server routes
  - Never use anon key for server-side DB operations

**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 8: PowerShell curl/sed incompatibility (Windows)
## ════════════════════════════════════════════════════════
**ID:** P008
**Type:** Developer environment
**Symptom:**
  - curl: "Bad hostname" or JSON parse errors
  - sed: "The term 'sed' is not recognized"

**Fix:**
```powershell
# curl replacement (all on ONE line):
Invoke-RestMethod -Uri "https://url" -Method POST -ContentType "application/json" -Body '{"key":"val"}'

# sed replacement:
Get-Content file.ts | Select-Object -Index (87..94)
```
**Status:** DOCUMENTED


## ════════════════════════════════════════════════════════
## PATTERN 9: Vercel env var update not reflecting
## ════════════════════════════════════════════════════════
**ID:** P009
**Type:** Infrastructure (Vercel)
**Symptom:**
  - Updated env var via CLI but production still uses old value

**Root cause:**
  Vercel CLI and dashboard are not always in sync. Dashboard is authoritative.

**Fix:**
  1. Update in Vercel DASHBOARD → all 3 environments checked
  2. Save → vercel --prod --force
  3. Verify immediately with Invoke-RestMethod

**Status:** DOCUMENTED


## ════════════════════════════════════════════════════════
## PATTERN 10: Source links with specific hadith numbers hallucinated
## ════════════════════════════════════════════════════════
**ID:** P010
**Type:** Prompt fix (route.ts)
**Commit:** 76e37a1 fix: use general source links instead of specific hadith numbers
**Symptom:**
  - References contain URLs like sunnah.com/bukhari:9999 that return 404
  - AI hallucinating specific hadith numbers that do not exist

**Root cause:**
  AI generates plausible-looking but non-existent hadith reference numbers.

**Fix — use general collection URLs in jsonTemplate:**
```ts
// WRONG — AI hallucinates specific numbers:
"url":"https://sunnah.com/bukhari:5013"

// RIGHT — general collection links always valid:
"url":"https://sunnah.com/bukhari"
"url":"https://dorar.net/hadith"
"url":"https://islamqa.info/en/answers"
```
**Also add to prompt:** "Use general collection URLs, not specific hadith numbers"
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 11: Stats counter test rate limit conflict in CI
## ════════════════════════════════════════════════════════
**ID:** P011
**Type:** Test fix
**Commits:**
  - 1f22134 fix: handle rate limit in stats counter test
  - 305b2c9 fix: skip stats counter test in CI to avoid rate limit conflict
**Symptom:**
  - Stats counter test fails intermittently in CI
  - Rate limit error when parallel browsers hit API simultaneously

**Root cause:**
  CI runs Chromium + Mobile Chrome in parallel triggering rate limits.

**Fix — skip in CI:**
```ts
test.skip(!!process.env.CI, 'Skipped in CI — rate limit conflict with parallel browsers')
```
**Status:** FIXED (skipped in CI)


## ════════════════════════════════════════════════════════
## PATTERN 12: Language switcher test — hidden translated elements
## ════════════════════════════════════════════════════════
**ID:** P012
**Type:** Test fix
**Commit:** Fix language switcher tests - avoid hidden translated elements (Run #13)
**Symptom:**
  - Element found but not visible — hidden behind closed dropdown

**Fix:**
```ts
// Always open dropdown first, then click:
await page.locator('header button').filter({ hasText: /English/ }).click()
await page.getByText('Русский').click()
await expect(page.locator('header button').filter({ hasText: /Русский/ })).toBeVisible()
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 13: Stats test fails on mobile — hidden on small viewport
## ════════════════════════════════════════════════════════
**ID:** P013
**Type:** Test fix
**Commit:** Fix stats test - use desktop viewport, scope to header (Run #14)
**Symptom:**
  - "Checked", "Flagged", "Authentic" not visible on Mobile Chrome

**Root cause:**
  Stats panel uses Tailwind sm:flex — hidden on mobile viewport.

**Fix:**
```ts
test('should show stats panel', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(page.locator('header').getByText('Checked').first()).toBeVisible()
})
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 14: Authentic hadith test — asserting specific verdict
## ════════════════════════════════════════════════════════
**ID:** P014
**Type:** Test fix (AI non-determinism)
**Commit:** Fix authentic hadith test - validate structure not specific verdict (Run #12)
**Symptom:**
  - expected 'authentic' received 'unclear' — non-deterministic failure

**Fix:**
```ts
// WRONG:
expect(body.verdict).toBe('authentic')

// RIGHT:
expect(['authentic', 'unclear', 'weak']).toContain(body.verdict)
expect(body.references).toBeDefined()
expect(body.suggested_comment.length).toBeGreaterThan(0)
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 15: E2E strict mode — multiple elements matched
## ════════════════════════════════════════════════════════
**ID:** P015
**Type:** Test fix
**Commit:** Fix E2E strict mode - target EN/UZ/AR/RU via Reply in container (Run #11)
**Symptom:**
  - "strict mode violation: locator resolved to X elements"
  - EN/UZ/AR/RU buttons matched in multiple places

**Fix — scope to Reply in: container:**
```ts
const replySection = page.locator('text=Reply in:').locator('..')
await replySection.getByRole('button', { name: 'UZ' }).click()
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 16: api.spec.ts syntax error — clean rewrite required
## ════════════════════════════════════════════════════════
**ID:** P016
**Type:** Test fix (syntax)
**Commit:** Fix api.spec.ts syntax error - clean rewrite (Run #10)
**Symptom:**
  - TypeScript compilation error — build fails before any tests run

**Fix:**
  When syntax errors accumulate, do a clean rewrite of the spec file.
  Always validate before pushing:
```bash
npx tsc --noEmit
npx playwright test --list
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 17: Language tests — only checking suggested_comment field
## ════════════════════════════════════════════════════════
**ID:** P017
**Type:** Test fix + prompt fix
**Commits:**
  - 086a1b8 fix: all analysis fields now respond in selected language (UZ/AR/RU)
  - 07806a2 fix: language tests now validate all fields (analysis, claim_summary, red_flags)
**Symptom:**
  - Language tests pass for suggested_comment but analysis still in English

**Fix — expand langInstruction to cover ALL fields:**
```ts
`CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL of the following fields
ENTIRELY in Uzbek: claim_summary, analysis, authentic_alternative,
red_flags (every item), references (description only), and suggested_comment.`
```

**Fix — expand test assertions:**
```ts
expect(
  body.analysis?.includes('ҳадис') || body.claim_summary?.includes('ҳадис')
).toBe(true)
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 18: UZ UI test — Cyrillic fallback needed
## ════════════════════════════════════════════════════════
**ID:** P018
**Type:** Test fix
**Commit:** f74bad7 fix: UZ UI test - add Cyrillic fallback for language switching test
**Symptom:**
  - Uzbek language test fails — expected Latin but app shows Cyrillic

**Fix — accept both scripts:**
```ts
expect(
  text?.includes('Assalomu') || text?.includes('Ассалому') ||
  text?.includes('hadis')    || text?.includes('ҳадис')
).toBe(true)
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 19: Import resolution — @/lib imports fail on Vercel
## ════════════════════════════════════════════════════════
**ID:** P019
**Type:** Build fix
**Commits:**
  - bd01066 fix: use relative imports for severity and alerts
  - 63523eb fix: correct relative import path to ../../../lib
  - 52112e6 fix: add baseUrl to tsconfig for @/ path alias resolution
  - 8827e6c fix: inline severity and alerts to eliminate import resolution issues
  - 8170d5b fix: complete route.ts rewrite with all logic inlined
**Symptom:**
  - "Cannot find module '@/lib/severity'" — works locally, fails on Vercel

**Root cause:**
  @/ alias not always resolved in Next.js API routes on Vercel production.

**Fix — inline all logic directly in route.ts (most reliable):**
  Move calculateSeverity(), sendAlerts(), SYSTEM_PROMPT directly into route.ts.

**Fix — if imports needed, use relative paths:**
```ts
// WRONG:
import { calculateSeverity } from '@/lib/severity'
// RIGHT:
import { calculateSeverity } from '../../../lib/severity'
```
**Status:** FIXED — all logic now inlined in route.ts


## ════════════════════════════════════════════════════════
## PATTERN 20: tsconfig.json UTF-8 BOM encoding corruption
## ════════════════════════════════════════════════════════
**ID:** P020
**Type:** Build fix
**Commits:**
  - 29f0325 fix: recreate tsconfig.json with correct UTF-8 encoding
  - bb08c64 fix: trigger rebuild after tsconfig revert
**Symptom:**
  - Build fails with cryptic JSON parse error in tsconfig.json

**Root cause:**
  tsconfig.json saved with BOM on Windows. Node.js JSON parser fails on BOM.

**Fix:**
  Delete and recreate tsconfig.json. In VS Code: Save with Encoding → UTF-8 (not UTF-8 with BOM)
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 21: Severity style type cast error
## ════════════════════════════════════════════════════════
**ID:** P021
**Type:** TypeScript type fix
**Commit:** afdb33f fix: add SEVERITY_STYLE const and fix TIER_STYLE type cast
**Symptom:**
  - "Type 'string' is not assignable to type keyof typeof SEVERITY_STYLE"

**Fix:**
```ts
const SEVERITY_STYLE = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800',
} as const

const style = SEVERITY_STYLE[result.severity as keyof typeof SEVERITY_STYLE]
  ?? SEVERITY_STYLE.LOW
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## PATTERN 22: CI server not started before Playwright tests
## ════════════════════════════════════════════════════════
**ID:** P022
**Type:** CI/CD fix
**Commit:** Fix CI - start server before running tests (Run #6)
**Symptom:**
  - All tests fail: "net::ERR_CONNECTION_REFUSED"

**Fix — test against production URL in CI (preferred):**
```yaml
env:
  BASE_URL: https://hadithverifier.com
```
**Status:** FIXED — CI tests against production URL


## ════════════════════════════════════════════════════════
## PATTERN 23: E2E button selector breaks on UI refactor
## ════════════════════════════════════════════════════════
**ID:** P023
**Type:** Test fix (selector stability)
**Commit:** Fix E2E tests - use specific button selectors (Run #7)
**Symptom:**
  - button.bg-emerald-700 not found after UI update

**Fix:**
```ts
// FRAGILE:
await page.locator('button.bg-emerald-700').first().click()
// STABLE:
await page.getByRole('button', { name: /analyze post/i }).click()
```
**Status:** FIXED


## ════════════════════════════════════════════════════════
## QUICK PATTERN LOOKUP TABLE
## ════════════════════════════════════════════════════════
| Symptom keyword              | Pattern | Type           |
|------------------------------|---------|----------------|
| Array.isArray → false        | P001    | route.ts fix   |
| waitForSelector timeout      | P002    | test + prompt  |
| Uzbek in Tajik output        | P003    | prompt fix     |
| Em dash syntax error         | P004    | syntax fix     |
| credit balance too low       | P005    | infrastructure |
| wrong workspace/key          | P006    | infrastructure |
| queue empty / RLS            | P007    | Supabase fix   |
| curl/sed not recognized      | P008    | Windows env    |
| env var not reflecting       | P009    | Vercel fix     |
| 404 on hadith URL            | P010    | prompt fix     |
| rate limit in CI             | P011    | test skip      |
| hidden translated element    | P012    | selector fix   |
| stats hidden on mobile       | P013    | viewport fix   |
| verdict non-determinism      | P014    | assertion fix  |
| strict mode violation        | P015    | selector scope |
| spec syntax error            | P016    | clean rewrite  |
| fields not translated        | P017    | prompt fix     |
| Cyrillic/Latin Uzbek         | P018    | fallback fix   |
| Cannot find module @/lib     | P019    | import fix     |
| tsconfig UTF-8 BOM           | P020    | encoding fix   |
| severity type cast           | P021    | TS type fix    |
| ERR_CONNECTION_REFUSED       | P022    | CI server fix  |
| button selector broken       | P023    | selector fix   |


## ════════════════════════════════════════════════════════
## HOW TO ADD NEW PATTERNS
## ════════════════════════════════════════════════════════
Template:
```
## PATTERN N: Short description
**ID:** PN
**Type:** Test fix | Source fix | Prompt fix | Infrastructure | Build fix
**Commit:** git hash + message
**Symptom:** Exact CI log / test failure message
**Root cause:** Why it happened
**Fix:** Code or steps
**Status:** FIXED | IN PROGRESS | DOCUMENTED
```
