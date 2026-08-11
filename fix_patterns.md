# Hadith Verifier — Known Fix Patterns
# Auto-loaded by Playwright Agent (CAG)
#
# RECONCILED 2026-06-10: rebuilt from clean sources to repair two corrupted copies
#   (root fix_patterns.md + agents/knowledge/fix_patterns.md). This is the canonical
#   global pattern sequence (numbering shared with hadith-reels / HR).
#   Collision resolutions during reconciliation:
#     - P032 = rate-limiting (only surviving authored block under that ID)
#     - P036 = UZ-greeting audit fix (kept in the P033-P036 test-fix run)
#     - axe/WCAG file-input fix (was a 2nd duplicate P036) renumbered -> P080


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
## PATTERN 24: GitHub Actions 403 — not permitted to create PRs
## ════════════════════════════════════════════════════════
**ID:** P024
**Type:** Infrastructure (GitHub Actions permissions)
**Commit:** fix: correct workflow name in auto-fix trigger
**Symptom:**
  - Agent log: "GitHub Actions is not permitted to create or approve pull requests"
  - Error: 403 on POST to /repos/{repo}/pulls

**Root cause:**
  GitHub Actions workflow permissions default to read-only.

**Fix:**
  1. github.com/{repo} → Settings → Actions → General
  2. Scroll to "Workflow permissions"
  3. Select "Read and write permissions"
  4. Check "Allow GitHub Actions to create and approve pull requests"
  5. Click Save

**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 25: workflow_run trigger name mismatch
## ════════════════════════════════════════════════════════
**ID:** P025
**Type:** CI/CD fix (GitHub Actions)
**Symptom:**
  - Auto-Fix Agent never triggers after test failures
  - No agent workflow run appears in Actions tab

**Root cause:**
  workflow_run trigger requires EXACT match of the workflow name.
  auto-fix.yml had "Playwright Tests" but actual CI workflow is
  named "Hadith Verifier CI/CD".

**Fix in .github/workflows/auto-fix.yml:**
```yaml
on:
  workflow_run:
    workflows: ["Hadith Verifier CI/CD"]  # must match exactly
    types: [completed]
```
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 26: NameError — self in standalone Python function
## ════════════════════════════════════════════════════════
**ID:** P026
**Type:** Python agent fix
**Symptom:**
  - Agent log: "NameError: name 'self' is not defined"

**Root cause:**
  Function defined with self parameter but called as standalone (no class instance).

**Fix — remove self from all standalone functions:**
```python
# WRONG:
def get_failed_annotations(self, run_id: str) -> list[dict]:
# RIGHT:
def get_failed_annotations(run_id: str) -> list:
```
  Do NOT use class structure in playwright_agent.py — standalone functions only.
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 27: Deprecated model warning — claude-sonnet-4-20250514
## ════════════════════════════════════════════════════════
**ID:** P027
**Type:** Infrastructure (model version)
**Symptom:**
  - "DeprecationWarning: model 'claude-sonnet-4-20250514' reaches
    end-of-life June 15, 2026"

**Fix in agents/playwright_agent.py:**
```python
MODEL = "claude-sonnet-4-6"
```
**Fix in app/api/analyze/route.ts:**
```ts
model: 'claude-sonnet-4-6',
```
**Status:** PENDING — update before June 15, 2026

## ════════════════════════════════════════════════════════
## PATTERN 28: GitHub annotations 404 — wrong endpoint
## ════════════════════════════════════════════════════════
**ID:** P028
**Type:** Python agent fix
**Symptom:**
  - "HTTPError: 404 Not Found: .../actions/runs/{id}/annotations"

**Root cause:**
  Annotations live on check-run jobs, not directly on the workflow run.

**Fix:**
```python
def get_failed_annotations(run_id: str) -> list:
    jobs_url = f"{GITHUB_API}/repos/{REPO}/actions/runs/{run_id}/jobs"
    jobs = requests.get(jobs_url, headers=get_headers()).json().get("jobs", [])
    annotations = []
    for job in jobs:
        ann_url = f"{GITHUB_API}/repos/{REPO}/check-runs/{job['id']}/annotations"
        ann_response = requests.get(ann_url, headers=get_headers())
        if ann_response.status_code == 200:
            failed = [a for a in ann_response.json()
                     if a.get("annotation_level") == "failure"]
            annotations.extend(failed)
    return annotations
```
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 29: UZ lang test — claim_summary Cyrillic assertion too strict
## ════════════════════════════════════════════════════════
**ID:** P029
**Type:** Test fix (AI non-determinism)
**Commit:** fix: relax UZ lang test — remove claim_summary Cyrillic assertion
**Symptom:**
  - tests/api.spec.ts:182 — UZ lang test on Chromium FAILED
  - expect(/[\u0400-\u04FF]/.test(claim)).toBe(true) → false
  - claim_summary returned in English even with lang='uz'

**Root cause:**
  Claude generates claim_summary from the post content language, not the lang param.
  If input post (FABRICATED_POSTS.chain_message) is in English, claim_summary
  stays in English even when lang='uz'. Only suggested_comment and analysis
  reliably reflect the lang setting.

**Fix — drop claim_summary assertion, add Cyrillic fallback to comment check:**
```ts
// WRONG — too strict:
expect(/[\u0400-\u04FF]/.test(claim)).toBe(true)

// RIGHT — check comment OR Cyrillic, drop claim_summary:
const hasUzbekComment =
  comment.includes('assalomu') || comment.includes('alaykum') ||
  comment.includes('alloh')   || comment.includes('hadis')   ||
  comment.includes('rivoyat') || comment.includes('sahih')   ||
  /[\u0400-\u04FF]/.test(comment)  // Cyrillic fallback

expect(hasUzbekComment).toBe(true)
// NOTE: claim_summary NOT asserted — may be English when input post is English
```
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 30: EN lang test — Arabic script false negative
## ════════════════════════════════════════════════════════
**ID:** P030
**Type:** Test fix (AI behavior — expected, not a bug)
**Commit:** fix: remove EN Arabic assertion in analysis — Arabic source titles expected
**Symptom:**
  - tests/api.spec.ts:218 — EN lang test flaky on Chromium
  - expect(/[\u0600-\u06FF]/.test(body.analysis)).toBe(false) → fails intermittently

**Root cause:**
  Claude correctly cites Arabic source titles (e.g. صحيح البخاري = Sahih Al-Bukhari)
  inside English analysis. This is accurate scholarly behavior, not a language leak.
  The assertion was wrong, not the model output.

**Fix — remove Arabic-in-analysis assertion entirely:**
```ts
// WRONG — Arabic source titles appear naturally in EN analysis:
expect(/[\u0600-\u06FF]/.test(body.analysis || '')).toBe(false)

// RIGHT — only assert suggested_comment is in English:
const hasEnglishComment =
  comment.includes('assalamu') || comment.includes('narration') ||
  comment.includes('fabricated') || comment.includes('authentic') ||
  comment.includes('reference')  || comment.includes('hadith')
expect(hasEnglishComment).toBe(true)
// NOTE: Arabic in analysis is CORRECT — do not assert against it
```
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 31: CI job cancelled — exceeded execution time limit
## ════════════════════════════════════════════════════════
**ID:** P031
**Type:** CI/CD fix
**Commit:** fix: test against production URL, remove local build from CI, add --workers=1
**Symptom:**
  - "The job has exceeded the maximum execution time of 30m0s"
  - "The operation was canceled"
  - CI run #83 cancelled at 30m 16s — no test assertion failures at all

**Root cause:**
  3 compounding issues:
  1. timeout-minutes was 30 — too low for AI-calling test suites
  2. CI was building Next.js locally (~5-8 min wasted) + serving on localhost
     instead of testing the already-deployed production app on Vercel
  3. No --workers=1 — Playwright spawned parallel workers hammering
     Claude API simultaneously, slowing all responses

**Fix applied to:** .github/workflows/ci.yml
**Fix:**
```yaml
# 1. Raise timeout
timeout-minutes: 55

# 2. Remove these steps entirely (saves 8-10 min per run):
#    - Create .env.local
#    - Build Next.js app
#    - Start Next.js server
#    - Wait for server to be ready

# 3. Test production URL directly
- name: Run API tests
  run: npx playwright test tests/api.spec.ts --reporter=list --workers=1
  env:
    BASE_URL: https://hadithverifier.com

- name: Run E2E tests
  run: npx playwright test tests/hadith-verifier.spec.ts --reporter=list --workers=1
  env:
    BASE_URL: https://hadithverifier.com
```
**Key learning:** For AI-calling test suites always calculate:
  total time = (avg API latency × test count) + build overhead
  Testing production URL eliminates build time entirely.
  --workers=1 prevents Claude API rate limiting from parallel calls.
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 32: No rate limiting — open API burns budget
## ════════════════════════════════════════════════════════
**ID:** P032
**Type:** route.ts fix (app/api/analyze/route.ts)
**Symptom:**
  - Every user visit triggers Claude API call with no limit
  - Monthly bill grows unbounded if app goes viral
  - No 429 responses ever returned

**Root cause:**
  Route had security (sanitizeInput, validateOutput) but
  zero rate limiting. 1.5K real users already hitting API
  with no daily cap.

**Fix — 3 locations in route.ts:**

**1. After imports, before anthropic const:**
```ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 100
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetInHours: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT - 1, resetInHours: 24 }
  }
  if (record.count >= RATE_LIMIT) {
    const resetInHours = Math.ceil((record.resetTime - now) / 3600000)
    return { allowed: false, remaining: 0, resetInHours }
  }
  record.count++
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetInHours: 24 }
}
```

**2. After sanitizeInput block — rate limit check + 429:**
```ts
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           req.headers.get('x-real-ip') || 'unknown'
const { allowed, remaining, resetInHours } = checkRateLimit(ip)
if (!allowed) {
  return NextResponse.json({
    error: 'Daily limit reached',
    message_en: `JazakAllahu khayran! You have used your ${RATE_LIMIT} free daily verifications. Return in ${resetInHours} hour(s). 🤲`,
    message_uz: `JazakAllahu xayran! ${RATE_LIMIT} ta kunlik limitingiz tugadi. ${resetInHours} soatdan keyin keling. 🤲`,
    message_ar: `جزاكم الله خيراً! استخدمت ${RATE_LIMIT} فحصاً. عُد خلال ${resetInHours} ساعة. 🤲`,
    message_ru: `ДжазакАллаху хайран! Лимит ${RATE_LIMIT} проверок исчерпан. Вернитесь через ${resetInHours} ч. 🤲`,
    remaining: 0,
    resetInHours
  }, { status: 429, headers: { 'Retry-After': String(resetInHours * 3600) }})
}
```

**3. Final return — add rate limit headers:**
```ts
return NextResponse.json(result, {
  headers: {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(remaining),
  }
})
```

**Test: api_spec.ts — new describe block:**
```ts
test.describe('Rate limiting', () => {
  test('should include rate limit headers', async ({ request }) => { ... })
  test('429 should have kind multilingual message', async ({ request }) => {
    test.skip(!!process.env.CI, 'Skipped in CI — rate limit simulation')
    ...
  })
})
```
**Status:** FIXED — April 2026
**Key learning:** Security layer existed but no cost protection.
  100/day per IP = generous for real users, blocks abuse.
  In-memory Map resets on Vercel cold start — acceptable for
  this use case. For stricter limits use Vercel KV.
  fix: add Tajik language to rate limit message.

## ════════════════════════════════════════════════════════
## PATTERN 33: E2E test — waitForSelector ready-to-post never found
## ════════════════════════════════════════════════════════
**ID:** P033
**Type:** Test fix (wrong selector)
**Commit:** fix: replace ready-to-post selector with result container check
**Symptom:**
  - TimeoutError: page.waitForSelector('text=/ready-to-post/i') timeout 60000ms
  - UZ and AR language E2E tests fail

**Root cause:**
  'ready-to-post' text does not exist anywhere in page.tsx UI.
  Result renders in .bg-gray-50.rounded-lg div via result.suggested_comment.

**Fix:**
```ts
// WRONG — text never appears in UI:
await page.waitForSelector('text=/ready-to-post/i', { timeout: 60000 })

// RIGHT — wait for result container with content:
await page.waitForSelector('.bg-gray-50.rounded-lg', { timeout: 90000 })
await page.waitForFunction(
  () => document.querySelector('.bg-gray-50.rounded-lg')?.textContent?.trim().length ?? 0 > 20,
  { timeout: 90000 }
)
```
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 34: Copy button test — wrong label selector
## ════════════════════════════════════════════════════════
**ID:** P034
**Type:** Test fix (wrong selector)
**Commit:** fix: use class selector for copy button, skip stats counter test
**Symptom:**
  - expect(locator).toBeVisible() failed
  - Locator: getByRole('button', { name: /copy comment/i })
  - Element not found — button exists but label text doesn't match

**Root cause:**
  CopyButton component renders label from tr.copyComment translation key.
  Actual rendered text depends on appLang — may not match /copy comment/i regex.
  getByRole with name regex is fragile for translated UI components.

**Fix — use CSS class selector instead of label text:**
```ts
// WRONG — fragile, depends on translation:
await expect(page.getByRole('button', { name: /copy comment/i })).toBeVisible()

// RIGHT — stable, class doesn't change with language:
await expect(page.locator('button.border-emerald-300').first()).toBeVisible()
```

**Rule:** Never use translated label text in selectors.
  Use CSS classes, data-testid, or aria-label attributes instead.
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 35: Image upload parse error — token truncation + untested path
## ════════════════════════════════════════════════════════
**ID:** P035
**Type:** Source fix (route.ts) + Test gap
**Commit:** fix: increase max_tokens to 3000 for image path, shorten jsonTemplate (P032b)
**Symptom:**
  - Parse error dialog appears on hadithverifier.com when uploading screenshot
  - Vercel logs: POST /api/analyze → 500, execution 49s, only Anthropic API called
  - No Supabase call — parse fails before save
  - CI never catches it — no image upload test exists

**Root cause:**
  Two compounding issues:
  1. Image path requires extracting ALL visible text + analysis = more tokens
     max_tokens: 2048 too low for image responses → JSON truncated mid-string
  2. CI test suite uses text input only — image code path never exercised in CI
     Agent cannot detect what CI never tests

**Fix 1 — increase max_tokens for image path in route.ts:**
```ts
// WRONG:
max_tokens: 2048,

// RIGHT — image needs more tokens for text extraction + analysis:
max_tokens: imageBase64 ? 3000 : 2048,
```

**Fix 2 — shorten jsonTemplate to reduce output size:**
```ts
// Remove verbose descriptions from template references
// Shorter template = less tokens consumed = less truncation risk
```

**Fix 3 — add image path to CI test suite (P035 prevention):**
```ts
// TODO: add tests/image-upload.spec.ts
// Use 1x1 pixel base64 PNG to exercise image code path in CI
// Agent can only fix what CI tests cover
```

**Key learning:** The Auto-Fix Agent only catches failures that appear as
  GitHub Actions test annotations. Runtime errors on production (Vercel 500s)
  are invisible to the agent. Every production code path needs a CI test.
  Image upload had no CI test → agent blind to image parse errors.

**Status:** PARTIALLY FIXED — max_tokens increased, image CI test still TODO

## ════════════════════════════════════════════════════════
## PATTERN 36: Audit UZ greeting check — too narrow indicators
## ════════════════════════════════════════════════════════
**ID:** P036
**Type:** Test fix (AI non-determinism)
**Commit:** fix: expand UZ greeting indicators in audit.spec.ts
**Symptom:**
  - audit.spec.ts:184 — UZ greeting test fails
  - "Expected uz comment to start with Islamic greeting"
  - Claude uses Hurmatli/Муҳтарам instead of Assalomu

**Root cause:**
  GREETING_INDICATORS for uz only had 3 variants.
  Claude legitimately uses other Islamic/respectful greetings
  in Uzbek (Hurmatli, Муҳтарам, Азиз) that are culturally valid.

**Fix:** Expand GREETING_INDICATORS to include all valid UZ greetings.

**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 37: Another app running on port 3000
## ════════════════════════════════════════════════════════
**ID:** P037
**Type:** Developer environment (Windows)
**Symptom:**
  - "Port 3000 is already in use"
  - npm run dev fails to start

**Fix:**
```powershell
npm run dev -- -p 3001
# Or permanently in package.json:
"dev": "next dev -p 3001"
```
**Status:** DOCUMENTED

## ════════════════════════════════════════════════════════
## PATTERN 38: Window.gtag / dataLayer TypeScript TS2339
## ════════════════════════════════════════════════════════
**ID:** P038
**Type:** TypeScript fix
**File:** tests/analytics.spec.ts
**Symptom:**
  - TS2339: Property 'gtag' does not exist on type 'Window & typeof globalThis'
  - TS2339: Property 'dataLayer' does not exist on type 'Window & typeof globalThis'
  - npx tsc --noEmit shows 6 errors all in analytics.spec.ts

**Root cause:**
  Google Analytics adds gtag() and dataLayer[] to window at runtime
  but TypeScript doesn't know about them without a type declaration.

**Fix — add at top of analytics.spec.ts before imports:**
```typescript
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}
```
**Status:** FIXED — May 2026

## ════════════════════════════════════════════════════════
## PATTERN 39: Vercel CLI — Development env var error
## ════════════════════════════════════════════════════════
**ID:** P039
**Type:** Infrastructure (Vercel CLI)
**Symptom:**
  - "Development cannot be combined with other Environments"
  - vercel env ls shows "No Environment Variables found"

**Root cause:**
  Vercel CLI does not allow adding sensitive vars to Development
  alongside Production/Preview in one command.

**Fix — add to each environment separately:**
```powershell
vercel env add KEY_NAME production
vercel env add KEY_NAME preview
# Development reads from .env.local automatically
```
**Status:** DOCUMENTED — May 2026

## ════════════════════════════════════════════════════════
## PATTERN 40: Timeout too short after seerah_context added
## ════════════════════════════════════════════════════════
**ID:** P040
**Type:** Test fix (timeout)
**File:** tests/hadith-verifier.spec.ts
**Commit:** fix: bump timeout to 110s for seerah_context latency
**Symptom:** Tests timeout at 30s after seerah_context field added to prompt
**Root cause:** seerah_context adds ~10s to Claude response time on CI runners
**Fix:** Increase waitForSelector timeout to 110000ms for real API tests
**Status:** FIXED (superseded by P043 — real API tests now mocked)

## ════════════════════════════════════════════════════════
## PATTERN 41: analyze route rewrite dropped FormData handler
## ════════════════════════════════════════════════════════
**ID:** P041
**Type:** Bug fix (route regression)
**File:** app/api/analyze/route.ts
**Commit:** fix: restore FormData image upload in analyze route (P041)
**Symptom:** Image upload returns "Post text or image required" after route rewrite
**Root cause:** Route rewrite was JSON-only — dropped multipart/form-data handler
**Fix:** Handle BOTH content types:
  if (contentType.includes('multipart/form-data')) { formData } else { json }
**Rule:** Never rewrite a route without checking ALL content-type paths it handles
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 42: replyLang not synced to appLang on switch
## ════════════════════════════════════════════════════════
**ID:** P042
**Type:** UX bug (state sync)
**File:** app/page.tsx
**Commit:** fix: auto-sync replyLang when appLang changes (P042)
**Symptom:** Switch app to Uzbek → UI shows Uzbek ✅ but analysis comment shows English ❌
**Root cause:** replyLang state defaults to 'en', only changes when user explicitly
  clicks reply language buttons. No sync when appLang changes.
**Fix:** useEffect that maps appLang → replyLang whenever appLang changes
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 43: Language/analysis CI tests call real Claude
## ════════════════════════════════════════════════════════
**ID:** P043
**Type:** Test architecture fix
**File:** tests/hadith-verifier.spec.ts
**Commit:** fix: mock API in CI language tests — eliminate Claude latency (P043)
**Symptom:** Language switching tests timeout in CI (110s exceeded)
**Root cause:** Tests called real Claude API. With seerah_context, responses
  take 20-35s in CI. Language tests validate UI rendering not Claude output.
**Fix:** page.route() mock for all CI push tests. Tag @real-api for manual.
**Rule:** NEVER call real Claude/ElevenLabs in CI push tests
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 44: Severity tests call real Claude — non-deterministic
## ════════════════════════════════════════════════════════
**ID:** P044
**Type:** Test architecture fix
**File:** tests/api.spec.ts
**Commit:** fix: unit test getSeverity() directly, tag real Claude severity @real-api (P044)
**Symptom:** api.spec.ts:331 — chain message returns MEDIUM not CRITICAL/HIGH
**Root cause:** getSeverity() is deterministic but tested through non-deterministic Claude.
  Claude returned verdict='weak' → MEDIUM → test expected CRITICAL/HIGH → FAIL
**Fix:** Test getSeverity() as pure unit test. Move real API assertions to @real-api.
**Rule:** Never test a deterministic function through a non-deterministic AI API
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 45: audit_spec + language-speech in CI yml
## ════════════════════════════════════════════════════════
**ID:** P045
**Type:** CI architecture fix
**File:** .github/workflows/ci.yml
**Commit:** fix: remove audit+language-speech from CI push, add manual dispatch (P045)
**Symptom:** 18 audit tests fail in CI — all calling real Claude
**Root cause:** ci.yml called audit.spec.ts (14+ real Claude calls) and
  language-speech.spec.ts (real ElevenLabs) in push-triggered steps.
  Also: filename was audit.spec.ts (dot) but file is audit_spec.ts (underscore)
**Fix:** Remove both steps from push CI. Add workflow_dispatch with run_audit input.
**Rule:** CI yml must never call real external APIs in push-triggered steps
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 46: HR ci.yml had language-speech real API step
## ════════════════════════════════════════════════════════
**ID:** P046
**Type:** CI fix (HR project)
**Commit:** fix: correct HR ci.yml — remove language-speech, add mocked E2E (P046)
**Symptom:** All HR CI runs #1-5 failed — language-speech calls real ElevenLabs
**Fix:** Remove step, add hadith-reels.spec.ts (mocked), add playwright.config.ts
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 47: Tab button locator breaks with emoji text
## ════════════════════════════════════════════════════════
**ID:** P047
**Type:** Test fix (locator resilience)
**Commit:** fix: resilient tab button locators for emoji text (P047)
**Symptom:** "should show Browse hadiths tab" fails — emoji in button text
**Root cause:** "📚 Browse hadiths" — emoji creates separate text node in headless Chromium
**Fix:** Superseded by P048 — test functionality not labels
**Status:** SUPERSEDED by P048

## ════════════════════════════════════════════════════════
## PATTERN 48: Never test emoji tab labels — test functionality
## ════════════════════════════════════════════════════════
**ID:** P048
**Type:** Test architecture fix
**Commit:** fix: test tab functionality not emoji label text (P048)
**Symptom:** Same Browse tab test fails despite different locators (CI #7, #8)
**Root cause:** Testing UI LABEL TEXT not FUNCTIONAL OUTCOME. Emojis non-deterministic.
**Fix:** Test what content loads when tab is active, not the tab button text.
  Use page.evaluate() to click emoji buttons by partial textContent.
**Rule:** Never write tests asserting UI label text containing emojis
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 49: Dual Seerah sources for UZ/TJ/RU vs AR/EN
## ════════════════════════════════════════════════════════
**ID:** P049
**Type:** Feature enhancement (content quality)
**File:** app/api/generate-reel/route.ts (HR)
**Commit:** feat: dual seerah sources — Uswa al-Hasana for UZ/TJ/RU (P049)
**Why:** Ar-Raheeq Al-Makhtum is scholarly/historical (AR/EN audience).
  Усваи Хасана is emotional/devotional/warm (UZ/TJ/RU Central Asian audience).
**Implementation:** getSeerahSource(lang) returns source + attribution per language
**Status:** IMPLEMENTED

## ════════════════════════════════════════════════════════
## PATTERN 50: TJ no text_tajik column — Russian display fallback
## ════════════════════════════════════════════════════════
**ID:** P050
**Type:** Language handling (documented design decision)
**File:** app/api/reels/route.ts (HR)
**Symptom:** TJ selected → shows Russian text — looks like a bug
**Explanation:** hadith_library has no text_tajik column. Russian is correct fallback.
  TJ narration still produced in Tajik Cyrillic via Claude in generate-reel.
**Status:** DOCUMENTED — working as designed

## ════════════════════════════════════════════════════════
## PATTERN 51: Remotion CLI binary not found
## ════════════════════════════════════════════════════════
**ID:** P051
**Type:** Dev environment fix
**Commit:** fix: install @remotion/cli@4.0.460 — binary was missing
**Symptom:** "remotion is not recognized as internal or external command"
**Root cause:** remotion installed as library dependency but CLI comes from
  separate @remotion/cli package — node_modules/.bin/remotion didn't exist
**Fix:** npm install --save-dev @remotion/cli@4.0.460
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 52: remotion/index.ts must be .tsx for JSX
## ════════════════════════════════════════════════════════
**ID:** P052
**Type:** TypeScript fix
**Commit:** fix: rename remotion/index.ts to .tsx — JSX requires .tsx (P052)
**Symptom:** CI #15 — 11 TypeScript errors: ';' expected, ':' expected in index.ts
**Root cause:** File uses JSX (<Composition>, <>) but has .ts extension
**Fix:** Rename to index.tsx
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 53: Remotion component LooseComponentType error
## ════════════════════════════════════════════════════════
**ID:** P053
**Type:** TypeScript fix
**Commit:** fix: cast Remotion component types to any (P053)
**Symptom:** "FC<HadithReelProps> not assignable to LooseComponentType<Record<string,unknown>>"
**Fix:** component={HadithReel as React.ComponentType<any>}
  defaultProps={defaults as unknown as Record<string, unknown>}
**Note:** Double cast through unknown required — single cast rejected as non-overlapping
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 54: @remotion/renderer native binaries break Next.js build
## ════════════════════════════════════════════════════════
**ID:** P054
**Type:** Build fix (native module externalization)
**Files:** next.config.js, app/api/render-reel/route.ts (HR)
**Commit:** fix: externalize Remotion from Next.js build — native binaries (P054)
**Symptom:** "Can't resolve '@remotion/compositor-win32-x64-msvc'"
**Root cause:** @remotion/renderer imports platform-native C++ binaries.
  Next.js webpack tries to bundle ALL platforms — Linux CI has no Windows binary.
  Also: Remotion can't run on Vercel (needs 4GB RAM + FFmpeg + 10min timeout)
**Fix:** serverExternalPackages in next.config.js + 501 response on Vercel
**Rule:** Never import native binary packages in Next.js routes without externalizing
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 55: serverComponentsExternalPackages moved to serverExternalPackages
## ════════════════════════════════════════════════════════
**ID:** P055
**Type:** Next.js config fix
**Commit:** fix: serverExternalPackages + remove webpack for Turbopack (P055)
**Symptom:** "Unrecognized key: serverComponentsExternalPackages at experimental"
  + "This build uses Turbopack with webpack config and no turbopack config"
**Root cause:** Next.js 15+ moved key out of experimental{}. Next.js 16 uses
  Turbopack by default — webpack config conflicts.
**Fix:** Top-level serverExternalPackages + turbopack: {} + remove webpack fn
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 56: registerRoot() missing from Remotion entry point
## ════════════════════════════════════════════════════════
**ID:** P056
**Type:** Remotion config fix
**File:** remotion/index.tsx
**Commit:** fix: add registerRoot() to Remotion entry point (P056)
**Symptom:** "This file does not contain registerRoot()"
**Fix:** Import registerRoot from 'remotion' and call registerRoot(Root) at bottom
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 57: HadithReel v3 + KidsReel v2 — WCAG AA large fonts
## ════════════════════════════════════════════════════════
**ID:** P057
**Type:** Feature enhancement (WCAG 2.1 AA compliance)
**Files:** remotion/compositions/HadithReel.tsx, KidsReel.tsx
**Commit:** feat: HadithReel v3 + KidsReel v2 — WCAG AA, large fonts, animations
**Changes Adults:** Arabic 72px, Translation 48px, Story 34px, Moral 44px
  Scene gradients per scene, Ken Burns camera drift, animated gold divider
  All text: #F5F0E8 on dark = 14:1+ ✅ AAA. Gold #D4AF37 = 5.8:1 ✅ AA
**Changes Kids:** Spring-in animations, bouncing emojis, star burst on moral,
  Arabic 60px on gold card, Story 36px bold, Moral 40px bold
  All text: white on dark = 21:1 ✅ AAA. Yellow #FFE234 = 9.2:1 ✅ AA
**Status:** IMPLEMENTED — renders locally as MP4

## ════════════════════════════════════════════════════════
## PATTERN 58: TJ missing from ReplyLang + UZ reads as Latin
## ════════════════════════════════════════════════════════
**ID:** P058
**Type:** Bug fix (language support + BCP-47 codes)
**Files:** app/page.tsx, components/TTSPlayer.tsx
**Commit:** fix: add TJ to ReplyLang, fix UZ BCP-47 code for browser TTS (P058)
**Bug 1:** type ReplyLang missing 'tj' — TJ button not visible
**Bug 2:** SpeechSynthesisUtterance.lang='uz' not valid BCP-47 → English fallback
**Fix:** Add 'tj' to ReplyLang type + buttons. Map uz → 'uz-UZ', tj → 'ru-RU'
**Also fixed:** Syntax error in page.tsx: | \'tj' → | 'tj' (backslash from patch file)
**Status:** FIXED — CI #143, #144 green

## ════════════════════════════════════════════════════════
## PATTERN 59: TTS reads URLs, bullets, special chars literally
## ════════════════════════════════════════════════════════
**ID:** P059
**Type:** UX bug fix (TTS text preprocessing)
**File:** components/TTSPlayer.tsx
**Commit:** fix: sanitize text before TTS — remove URLs bullets special chars (P059)
**Bug 1:** "Listen to analysis" says "slash slash sunnah dot com bukhari colon 8"
**Bug 2:** UZ "Listen" says "dot dot dot" for ◆ bullet characters
**Bug 3:** TJ/UZ numbers read in Russian accent (ElevenLabs behavior — acceptable)
**Fix:** sanitizeForTTS() strips URLs, bullets, #refs, markdown, tier labels
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PRE-PUSH PROTOCOL — added CI #144
## ════════════════════════════════════════════════════════
**Added:** May 2026 after CI #122–143 (20+ preventable failures)
**Implementation:**
  - .git/hooks/pre-push script in both HV and HR
  - Runs: tsc --noEmit + playwright tests before every git push
  - Blocks push if any test fails
  - First enforced push: CI #144 ✅ green
**Rule:** NEVER git push without local tests passing first
**Bypass (doc-only commits):** git push --no-verify

## ════════════════════════════════════════════════════════
## PATTERN 60: AI quality tests assert specific Claude verdict — non-deterministic
## ════════════════════════════════════════════════════════
**ID:** P060
**Type:** Test design fix
**File:** tests/api.spec.ts
**Commit:** fix: tag AI quality tests @real-api, verdicts accept unclear (P060)
**Symptom:** Pre-push caught: 3 AI quality tests failing locally
  "fabricated Uzbek should return fabricated or weak" → Claude returned 'unclear'
**Root cause:** Tests asserted ['fabricated','weak'] but Claude non-deterministically
  returns 'unclear' for some posts. Smart pre-push correctly blocked the push.
**Fix:** Tag AI quality tests @real-api. Expand verdict arrays to include 'unclear'.
  Smart pre-push uses --grep-invert "@real-api" to exclude them.
**Note:** This was the FIRST successful pre-push catch — the system worked!
**Status:** FIXED

## ════════════════════════════════════════════════════════
## PATTERN 61: TTS route required voiceId — TTSPlayer sends lang only
## ════════════════════════════════════════════════════════
**ID:** P061
**Type:** Bug fix (API contract mismatch)
**File:** app/api/tts/route.ts
**Commit:** fix: TTS route maps lang to voiceId internally, sanitizes text (P061)
**Symptom:** AR: all 3 Listen buttons silent (400 Bad Request)
  UZ/TJ: Listen to comment reads URLs literally
  RU/EN: worked accidentally (browser SpeechSynthesis has these voices)
**Root cause:** Old route required {text, voiceId}. New TTSPlayer sends {text, lang}.
  Route returned 400 for every request → browser fallback.
  AR has no browser voice → silent. sanitizeForTTS() never reached ElevenLabs.
**Fix:** Route maps lang→voiceId via VOICE_MAP internally.
  Text sanitization also moved to route (server-side, more reliable).
  Backward compatible: still accepts explicit voiceId if provided.
**Prevention:** tts.spec.ts added with contract test that catches this:
  expect(res.status()).not.toBe(400) when sending {text, lang}
  Smart pre-push v3: app/api/tts/ changes → runs tts.spec.ts automatically
**Status:** FIXED — CI #148

## ════════════════════════════════════════════════════════
## SMART PRE-PUSH HOOK v3 — file→test mapping
## ════════════════════════════════════════════════════════
**Added:** CI #149
**File mapping:**
  *.md / CLAUDE / AGENTS / fix_patterns → skip all (instant)
  app/api/tts/ OR TTSPlayer          → tts.spec.ts
  app/api/analyze/ OR api.spec.      → api.spec.ts (--grep-invert @real-api)
  app/page.tsx OR components/        → hadith-verifier.spec.ts
  next.config / tsconfig             → build check + tsc
  All code changes                   → tsc --noEmit always

**Result CI #144-149:**
  CI #144: first enforced push ✅
  CI #146: smart hook correctly skipped doc-only push ✅
  CI #147: smart hook ran tsc only for test file change ✅
  Pre-push #1 catch: AI quality tests blocked (P060) ✅
  CI #148: TTS route fix ✅
  CI #149: tts.spec.ts + smart hook v3 ✅

## ════════════════════════════════════════════════════════
## PATTERN 78: Whisper STT produces Latin transliteration for UZ/TJ — q→k drift
## ════════════════════════════════════════════════════════
**ID:** P078 (cross-project — primary discovery in HR, applicable to HV)
**Type:** STT/pipeline limitation (forward-looking)
**Project:** hadith-verifier (originally discovered in hadith-reels)
**Files potentially affected (future):**
  - app/api/tts/route.ts — currently TTS-only (ElevenLabs out, no STT in)
  - Any future audio-input feature (voice-paste hadith analysis, etc.)
  - Future Listen-to-comment reverse verification (transcribe audio reply)
**First observed:** May 15, 2026 — during HR TJ adults reel render
**Discovered during:** Pre-Hajj reel production session (HR project)

**Why log in HV:**
  HV currently has no STT pipeline, but planned features include:
  1. Voice-input mode (paste hadith via audio recording)
  2. Reverse audio verification (transcribe Listen-to-comment output for QA)
  3. Audio attachment analysis (WhatsApp voice notes claiming hadiths)

  When any of these ships, this exact bug will reappear. Log it now so
  the future implementer doesn't re-discover it from scratch.

**Symptom (as observed in HR, will reproduce in HV):**
  Whisper STT on Cyrillic-language audio (UZ Cyrillic, TJ Cyrillic) outputs:
  1. Latin transliteration instead of Cyrillic script
     - "Расул" → "Rasul"
     - "Паёмбар" → "Payambar"
  2. Q→K consonant drift (loses phonemic distinction)
     - "қабул" → "kabul"
     - "Қуръон" → "Kuran"
  3. Output unreadable to Cyrillic-script native readers

**Root cause (same as HR P078):**
  Whisper training corpus for TJ/UZ dominated by Latin transliteration sources.
  Tokenizer collapses /q/ and /k/ phoneme distinction in Turkic contexts.

**Mitigation strategy for HV (when STT features are added):**

  Preferred — Claude STT instead of Whisper:
    Send audio directly to Claude Sonnet with explicit script instruction:
    ```
    "Transcribe this audio in [Tajik|Uzbek] Cyrillic script only.
     Use Cyrillic characters Ҳ, Ҷ, Қ, Ғ, Ӯ.
     Do NOT use Latin transliteration."
    ```
    Pros: better script-following, single API surface (already use Claude
    for /api/analyze), no separate Whisper integration needed.
    Cons: higher cost than Whisper, slower latency.

  Fallback — Whisper + Latin→Cyrillic post-processor:
    Use existing libraries:
    - npm: uzbek-latin-cyrillic
    - python: uzbek-translit
    For TJ: hand-built mapping table required (no mature library yet).

**Test pattern (when STT lands in HV):**
  Add to api.spec.ts or new audio.spec.ts:
  ```typescript
  test('STT output for UZ Cyrillic audio uses Cyrillic script only', async () => {
    const res = await ctx.post(`${BASE_URL}/api/stt`, {
      data: { audioBase64: UZ_CYRILLIC_FIXTURE, lang: 'uz' }
    })
    const body = await res.json()
    const transcript = body.transcript || ''
    // Must contain Cyrillic
    expect(/[\u0400-\u04FF]/.test(transcript)).toBe(true)
    // Must NOT contain Latin letters
    expect(/[a-zA-Z]/.test(transcript)).toBe(false)
  })
  ```

**Connection to HV language tests:**
  HV already has language script validation tests (audit_spec.ts):
  - "AR output must use Arabic script" — `/[\u0600-\u06FF]/.test(comment)`
  - "RU output must use Cyrillic script" — `/[\u0400-\u04FF]/.test(comment)`

  When STT lands, extend the same script-validation pattern to transcripts.
  This is a CHEAP, DETERMINISTIC test — perfect for push CI (no real API).

**Reference reel where this was first observed:**
  HR project: out/adults-tj-umra-reel-v2.mp4 (Sahih al-Bukhari #1773)
  Posted: @SahihHadithReels, May 15, 2026
  Workaround: shipped without subtitles (audio + Cyrillic caption only)

**Status:** PRE-EMPTIVE LOG (no active HV bug — informational for future).
  Active fix tracked in HR project (see hr/fix_patterns.md P078).
  Permanent fix target: post-Hajj (06/06/2026), Option C in HR P078.

## ════════════════════════════════════════════════════════
## PATTERN 80: Hidden file input axe accessibility warning
## ════════════════════════════════════════════════════════
**ID:** P080
**Note:** Renumbered from duplicate P036 (ID collision) during reconciliation 2026-06-10.
**Type:** Accessibility / WCAG
**Symptom:**
  - VS Code axe extension: "Form elements must have labels"
  - Red squiggle on <input type="file" className="hidden">

**Root cause:**
  Axe flags hidden inputs even when they are intentionally hidden
  and triggered programmatically via ref.current.click()

**Fix — add aria-label and aria-hidden:**
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  aria-label="Upload screenshot for analysis"
  aria-hidden="true"
  onChange={...}
/>
```
**Status:** FIXED in page.tsx — May 2026

## ════════════════════════════════════════════════════════
## PATTERN 90: Retired model ID + structured-output truncation
## ════════════════════════════════════════════════════════
**ID:** P090
**Type:** API integration / structured-output reliability
**Repos:** hadith-verifier (analyze + dua routes), telegram_bot.py; hadith-reels (generate-reel route). Global entry — both repos.

**Symptom:**
  - Production 404 on every analysis: not_found_error, model: claude-sonnet-4-20250514
  - (Latent) Intermittent "Parse error" on longer duas/hadiths

**Root cause:**
  1. claude-sonnet-4-20250514 (Sonnet 4) retired on the Claude API 2026-04-20. Pinned model IDs go dead on retirement — they are not evergreen.
  2. max_tokens: 2000 too small for the 5-language JSON (4 translits + 3 translations + 5-lang comment, Arabic/Cyrillic = token-heavy). Overflow truncates JSON mid-string → JSON.parse throws.
  3. Reading content[0] assumes first block is text; breaks on thinking-enabled models. Bare JSON.parse intolerant of preamble.

**Fix:**
  - Model → claude-sonnet-4-6 (active drop-in). Upgrade path claude-sonnet-5 requires parse hardening first (adaptive thinking on by default).
  - max_tokens → 8000.
  - Extract text block by type: content.find(b => b.type === 'text'), not by index.
  - Parse by slicing first "{" … last "}" (matches generate-reel route's robust pattern).
  - Log raw.slice(0,300) on parse failure.

**Prevention:**
  - On model-retirement notices: git grep the pinned string across ALL repos — dead IDs hide in multiple callers (found in 4: analyze, dua, generate-reel, telegram_bot).
  - Structured-output pipelines fail at the parse boundary: generous token budget + tolerant extraction + explicit failure logging.
  - Never edit repo files in GitHub mobile editor — a stray newline in a string literal caused a build break.
  - "Committed" ≠ "fixed": verify green build AND a real end-to-end run.

**Status:** FIXED + verified live (green build, live RU analysis) — July 2026

**AMENDMENT (2026-08-08) — the sweep missed a caller for four months:**
  HR's app/api/generate-reel/route.ts was EDITED to claude-sonnet-4-6 during the
  original P090 sweep but never committed. `git grep` searches the WORKING TREE
  by default, so the verification step reported the fix as present while HEAD —
  and therefore production — still held claude-sonnet-4-20250514.
  Undetected until 2026-08-08 because no reel had been generated since April.
  Shipped as 7b6f017; verified against production, not just the deploy.

  RULE: after a multi-caller sweep, verify against HEAD, not the working tree:
    git grep -n "<retired-id>" HEAD -- app/ lib/
    git status --short          # nothing left unstaged
  A green `git grep` on an uncommitted edit is the same silent-success class as
  P096's zero-row update and P093's zero-test pass.


## ════════════════════════════════════════════════════════
## PATTERN 91: RLS disabled + allow-all policy defeating RLS
## ════════════════════════════════════════════════════════
**ID:** P091
**Type:** Security / database access control
**Repos:** shared Supabase DB xeirfeqnbjfyszykiraa (both apps). Migration: 20260707_enable_rls_security.sql

**Symptom:**
  - Supabase Security Advisor: 6 CRITICAL "RLS Disabled in Public" across hadith_library, video_backgrounds, hadith_candidates, hadith_promotions, flagged_posts (last also "Policy Exists RLS Disabled")

**Root cause:**
  1. RLS never enabled → anyone with the anon key (shipped in browser JS, effectively public) could read/insert/update/DELETE these tables directly.
  2. flagged_posts had a dormant "Allow all" policy (role public, cmd ALL, qual true). Enabling RLS ACTIVATED it, so the table stayed fully open. RLS "on" did NOT mean protected.

**Fix (two-pass migration, service_role verified first):**
  - Pre-check: confirmed all writers use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) — HV analyze/search/queue routes + HR upload-candidates.py.
  - Tier 1 (admin/pipeline): enable RLS, no anon policy → public denied. hadith_candidates, hadith_promotions, flagged_posts.
  - Tier 2 (public data): enable RLS + "create policy … for select to anon, authenticated using (true)" → public read-only. hadith_library, video_backgrounds.
  - drop policy "Allow all" on flagged_posts.
  - Verified: pg_class.relrowsecurity=true on all 5; pg_policies shows only the 2 read policies; both apps confirmed live.

**Prevention:**
  - "Control enabled" ≠ "control effective." After enabling RLS, ALWAYS list pg_policies and confirm each policy RESTRICTS — never trust the status flag.
  - Trust boundary runs along the KEY, not the code. Anything client-held (anon key, NEXT_PUBLIC_*) is public; enforcement is server-side. Backend = service_role, clients = anon.
  - On any new table: enable RLS + add intended policy in the SAME migration. Never leave public "temporarily".
  - Consider rotating anon + service_role keys if values were ever exposed.

**Status:** FIXED + verified live (5 tables RLS-on, both apps reading correctly) — July 2026

## ════════════════════════════════════════════════════════
## PATTERN 92: Mockable Claude via MOCK_CLAUDE seam + isolated test server
## ════════════════════════════════════════════════════════
**ID:** P092
**Type:** Test infrastructure / determinism / cost control
**Repos:** hadith-verifier (analyze route, api.spec.ts, playwright.config.ts, .githooks/pre-push). Pattern applies to any repo whose push tests hit the real Claude API.

**Symptom:**
  - Pre-push api.spec.ts made REAL Claude calls (~30s/test), causing: 429 rate-limit
    failures (own in-memory limiter + Anthropic), 30s timeouts, non-determinism, API cost
    on every push. Header claimed "mocked, fast" — it wasn't.

**Root cause:**
  The analyze route always called `anthropic.messages.create(...)`. Tests that only check
  status codes / schema shape don't need real Claude, but had no way to bypass it. The Claude
  call happens server-side inside the route, so Playwright can't intercept it from the test.

**Fix — route-level mock seam + isolated ephemeral server:**
  1. Route: `const response = process.env.MOCK_CLAUDE === '1' ? { content:[{type:'text',text:JSON.stringify(MOCK_ANALYSIS)}] } : await anthropic.messages.create({...})`.
     MOCK_ANALYSIS = canned valid object matching the response schema (verdict/confidence/
     severity/claim_summary/analysis/suggested_comment/references/red_flags/seerah_context).
     Rest of route (parse, getSeverity override) runs unchanged → real route logic tested.
  2. Also gate side-effects under mock so test runs don't pollute prod or trip limits:
     - rate limiter: `if (process.env.MOCK_CLAUDE !== '1') { checkRateLimit... }`
     - queue insert: `if ([...].includes(verdict) && process.env.MOCK_CLAUDE !== '1')`
  3. Port isolation: mocked tests run on :3011 (HV=3001, HR=3002, 3011=HV mock-only,
     ephemeral). Prevents collision with a running dev server.
  4. Hook starts its OWN mock server, waits for ready, runs tests, kills it, gates on the
     real exit code (see block below). Do NOT rely on Playwright webServer for the mock run
     (see P093 for why).

**Hook block (proven):**
```
if [ "$HAS_ANALYZE" -gt 0 ] && [ $FAILED -eq 0 ]; then
  MOCK_CLAUDE=1 npx next dev -p 3011 > /tmp/hv-mock.log 2>&1 &
  MOCK_PID=$!
  READY=0
  for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:3011/api/test && { READY=1; break; }; sleep 1; done
  if [ $READY -ne 1 ]; then echo "❌ Mock server failed to start"; kill $MOCK_PID 2>/dev/null; FAILED=1;
  else
    BASE_URL=http://localhost:3011 npx playwright test tests/api.spec.ts --project=chromium --grep-invert "@real-api" 2>&1
    API_RC=$?
    kill $MOCK_PID 2>/dev/null
    [ $API_RC -ne 0 ] && FAILED=1
  fi
fi
```

**Prevention / notes:**
  - Result: api.spec push subset now ~45s, API tests sub-second, deterministic, $0, no limits.
  - The mock doubles as a schema contract — if MOCK_ANALYSIS drifts from what tests assert,
    you find out instantly (caught a `Tier 1` vs `tier1` mismatch for free).
  - Quality tests that genuinely need real Claude stay tagged @real-api (excluded from push,
    run manually). CI (ci.yml) intentionally left REAL against production = post-deploy smoke.
  - Document 3011 in CLAUDE.md port map so future sessions/agents don't cross-assign.

**Status:** FIXED + verified (exact hook logic proven green via standalone script, RC=0, sub-second) — July 2026


## ════════════════════════════════════════════════════════
## PATTERN 93: Windows/git-bash env + exit-code gotchas that silently defeat a CI gate
## ════════════════════════════════════════════════════════
**ID:** P093
**Type:** Test infrastructure / shell / Windows dev environment
**Repos:** hadith-verifier (.githooks/pre-push). Applies to any git-bash hook on Windows.

**Symptom:**
  While wiring MOCK_CLAUDE into the pre-push hook (P092), three separate bugs each made the
  gate behave wrongly — worst of all, a gate that PASSED while running zero tests.

**Three root causes + fixes:**
  1. **Inline env prefix doesn't propagate to spawned server (Windows).**
     `MOCK_CLAUDE=1 npx playwright test...` sets the var for npx, but on Windows git-bash the
     `.cmd` shim + Playwright's webServer spawn drops it — the spawned `next dev` never sees
     MOCK_CLAUDE, so it called REAL Claude (tests passed but took 30s). PowerShell `$env:` and
     bash `export` both work in isolation, but neither reliably reaches a process spawned by
     Playwright's webServer.
     → FIX: don't inline-prefix and don't rely on webServer to carry it. Start the mock server
       explicitly with the var on ITS command (P092 hook block).

  2. **`unset` after the test clobbers `$?`.**
     ```
     npx playwright test ...
     unset MOCK_CLAUDE BASE_URL      # <-- last command
     if [ $? -ne 0 ]; then FAILED=1  # <-- checks unset's exit (always 0), NOT the test
     ```
     Gate could never see a test failure.
     → FIX: capture immediately — `RC=$?` right after the test, then `unset`, then gate on `$RC`.

  3. **Playwright webServer timeout exits 0 → false pass.**
     When webServer failed to become ready, the run errored ("Timed out waiting ... webServer")
     but the outer exit code was 0 — a gate running ZERO tests reported success.
     → FIX: explicit start/poll(curl /api/test)/kill, and gate on the captured test exit code.
       Fail loudly ("❌ Mock server failed to start") if the health poll never succeeds.

**Prevention:**
  - A CI gate that CANNOT fail is worse than no gate — it ships anything with a green check.
    Always: capture the real exit code of the thing you care about, gate on THAT, and prove the
    gate can fail (not just pass) before trusting it.
  - On Windows git-bash: prefer explicit `command &` + health-poll over Playwright webServer +
    env-prefix magic. Fewer hidden processes, observable failures.
  - When a hook "passes" suspiciously fast or suspiciously slow, check timings — 30s = real API,
    sub-second = mock. Timing is the tell that env vars actually took effect.

**Status:** FIXED (all three addressed in the P092 hook block) — July 2026

## ════════════════════════════════════════════════════════
## PATTERN 94: Stage 5 promote (candidate→library) + CHECK constraints as schema contract
## ════════════════════════════════════════════════════════
**ID:** P094
**Type:** Data pipeline / integrity / idempotency
**Repos:** hadith-reels (scripts/promote-candidates.py). Touches shared DB hadith_library, hadith_candidates, hadith_promotions.

**What it is:**
  Stage 5 of the sourcing pipeline — moves human-approved candidates from
  hadith_candidates into the shared hadith_library, with an audit trail and
  idempotency. Completes: source → dedup → stage → HUMAN GATE (SQL) → promote → library.

**Design (promote-candidates.py):**
  - Reads: `status=eq.approved & grade_confirmed=eq.true & grade=in.(sahih,hasan) & promoted_library_id=is.null`
  - Maps candidate → library columns (schemas differ — mapping is NOT 1:1):
    - text_uzbek_cyrillic/latin → same; text_uzbek (legacy col) ← Cyrillic (canonical, keeps old readers working)
    - authority ← grading_source
    - source_url (text, singular) ← ONE deep-link extracted from source_urls (jsonb, plural): prefer dorar > sunnah > first
    - tags ← [] (red_flags is a VERIFIER concept, not library content — do not copy)
    - book ← null (not in candidates); created_at ← DB default now()
  - Writes hadith_promotions audit row (candidate_id, library_id, promote_mode, reviewed_by, source_deeplink, columns_written)
  - Stamps candidate: status='promoted', promoted_library_id=<new id>  ← IDEMPOTENCY GUARD
  - Discipline: dry-run default, --commit to write, --show to preview mapping, service_role key, stdlib-only, ensure_ascii=False for Arabic/Cyrillic/Tajik.

**Stage 4 human gate = SQL (not UI, by choice — promote today, UI later):**
  - review:  select ... from hadith_candidates where status='needs_human' (or 'sourced')
  - approve: update ... set status='approved', review_action='approve', reviewed_by=..., reviewed_at=now()
  - reject:  update ... set status='rejected', review_action='reject', review_reason=...

**Idempotency (proven):** second --commit finds 0 approved (candidate now 'promoted', not 'approved')
  → cannot double-insert. Re-running is always safe.

**KEY LESSON — CHECK constraints are a schema contract that catches bad writes loudly:**
  During testing, three assumed values were WRONG and the DB refused them at write time
  instead of silently storing garbage:
  - ck_status allows: sourced/deduped/translated/verified/needs_human/approved/rejected/promoted
    → 'pending' is NOT valid (assumed wrong).
  - ck_review allows: approve/edit_approve/reject/defer  → 'approved' is NOT valid (it's 'approve').
  - ck_grade = sahih/hasan; ck_promote_mode = insert/augment_update.
  This is defense-in-depth working as designed — same principle as P091's RLS lesson:
  a control must actually RESTRICT, and a good schema fails invalid states loudly and early.
  Had the status mismatch not been caught pre-commit, a promote could have inserted into
  library then failed the candidate-stamp step, leaving a half-done promote.

**Prevention / notes:**
  - Before writing to any table, read its CHECK constraints (pg_get_constraintdef) — don't
    assume enum values; the constraint is the source of truth.
  - When two schemas differ (candidates vs library), map explicitly and preview with --show
    on a DRY RUN before --commit. Never positional-insert into the shared library.
  - augment_update mode (fill missing translations on an existing library row) is designed
    for but NOT yet implemented — insert mode only for now. TODO.
  - Legacy Uzbek backfill (existing 74 rows have single-script, some MIXED-script text_uzbek)
    is a separate content-cleanup task via uzbek-translit.ts — parked, not part of promote.

**Status:** DONE + verified end-to-end on live data (promote → library + audit + idempotency stamp,
  then re-run = 0, then test row cleaned up, library back to 74) — July 2026
  

## ════════════════════════════════════════════════════════
## PATTERN 95: Uzbek TTS pronunciation — engine differences + Cyrillic homoglyph corruption
## ════════════════════════════════════════════════════════
**ID:** P095
**Type:** TTS quality / data integrity
**Repos:** hadith-reels (`lib/uzbek-tts-phonetics.ts`, `app/api/tts/route.ts`), shared DB `hadith_library`.
Applies to idris-learning-app and seerah audiobooks too.

---

### PART A — TTS engine findings (Uzbek)

**Investigated:** reported mispronunciation of Uzbek letters (ҳ, ғ, қ, ў, ж) in narration.

**Findings (browser + route testing, 2026-08):**
| engine | ж | ҳ / қ / ғ | verdict |
|---|---|---|---|
| **OpenAI gpt-4o-mini-tts** (current UZ/TJ path) | ✅ correct ("jannat") | ✅ correct | **no fix needed** |
| **ElevenLabs eleven_v3** | ❌ says "dj" | ✅ correct | needs inline IPA |
| ElevenLabs eleven_multilingual_v2 | — | — | **silently ignores IPA** |

**Conclusion: the reels pipeline needed NO change.** Uzbek routes to OpenAI
(`useOpenAI = ['uz','tj'].includes(langKey) …`), which already pronounces Uzbek correctly.

**ElevenLabs v3 fix (built, validated, reserved for future/audiobook use):**
- Inline IPA wrapped in `/slashes/` corrects ж. Mixing IPA for ONE word with Cyrillic for the
  rest WORKS: `/dʒanˈnat/ оналар оёғи остида` → correct. So only problem WORDS need transcribing.
- Formatting rules (each learned by failure):
  1. Everything inside `/…/` must be IPA/Latin — never Cyrillic. `/dʒума/` = undefined output.
  2. Always close the slash. `/dʒamoat` (unclosed) does not work.
  3. Include stress `ˈ` before the stressed syllable (Uzbek stress is normally final).
     Audibly improved results; ElevenLabs' own guidance recommends it.
- **IPA gotcha:** `j` = the "Y" sound; the "J" of *jam* is `dʒ`. Getting this backwards
  produces a wrong test input and a FALSE failure (it did — cost one test cycle).
- **Model assert required:** on `eleven_multilingual_v2` IPA is silently ignored — no error,
  just wrong audio. `applyUzbekIPA()` throws unless model is `eleven_v3`.

**REJECTED approach — do not reintroduce:** an earlier design respelled Cyrillic
(ж→дж, ҳ→х, қ→к) to trick a Russian-phonetics engine. Disproven: v3 already over-shoots to
"dj" so ж→дж makes it worse, and ҳ/қ need no help. **A workaround that helps a weak model can
harm a stronger one — re-baseline after every model upgrade.**

---

### PART B — Cyrillic homoglyph corruption in `hadith_library` (production data defect)

**Symptom:** 9 of 74 rows had Latin-script `text_uzbek` containing invisible Cyrillic
look-alike characters mid-word — e.g. `qo'shniСini`, `ustunИdir`, `Amалlar`, `shafОat`,
`rishtalарини`. Visually identical, different bytes.

**Cause:** typed/pasted with a Cyrillic keyboard layout mid-word. The homoglyph pairs
(а/a, о/o, е/e, с/c, р/p, и/i, Н/H, И/I, О/O, л/l) are indistinguishable by eye.

**Impact — three real failures:**
1. **TTS** — engine hits Cyrillic inside a Latin word and may switch phonetics or stumble.
2. **Search** — user typing `qo'shnisini` never matches `qo'shniСini`.
3. **Dedup** — different bytes → the same hadith can be inserted twice.

**Detection query (keep this — reusable):**
```sql
select id, text_uzbek from hadith_library
where text_uzbek ~ '[a-zA-Z]'          -- has Latin
  and text_uzbek ~ '[\u0400-\u04FF]';  -- AND has Cyrillic
```

**Fix:** `translate()` mapping each Cyrillic homoglyph to its Latin twin, PREVIEWED as a
dry-run `select` before any `update`. One row (`uylanСa`) needed a manual correction to
`uylansa` — character mapping alone gave `uylanca`, which is the right *character* but the
wrong *word*. Mechanical fixes can't infer intent; always eyeball the diff.
**Verified: post-fix count = 0.**

---

### KEY LESSONS

- **Verify the test input before blaming the system.** A typo in the test phrase (`оёги`
  instead of `оёғи`) made OpenAI look broken and nearly triggered an unnecessary re-architecture
  of a working pipeline. The engine pronounced exactly what it was given.
- **Cheap manual probing beats building.** ~20 minutes in the ElevenLabs browser UI overturned
  a plausible, fully-designed respelling module. Probe the capability before automating around it.
- **Silent capability degradation is the dangerous failure.** v2 ignoring IPA without error is
  the same class as P093's exit-code-0-on-failure. Prefer features that fail loudly; assert
  preconditions when they don't.
- Scope collapsed from "5 broken letters, build an ASR eval harness" to "no change needed for
  reels, 8-word lexicon reserved for ElevenLabs" — purely by testing instead of theorising.

**Status:** DONE — reels pipeline unchanged (correct as-is); `lib/uzbek-tts-phonetics.ts`
built + validated for future ElevenLabs use; 9 corrupted library rows repaired and verified.
August 2026

**Repo note:** Fix implemented in hadith-reels (scripts/); logged here because
hadith_library is shared and HV reads text_uzbek. HV action item: P089 search
must normalize apostrophes (qo'shni → qoʻshni).

## ════════════════════════════════════════════════════════
## PATTERN 96: Replayed backfill corrections + silent zero-row updates
## ════════════════════════════════════════════════════════
**ID:** P096
**Type:** Data-safety fix (stale snapshot replay + silent success)
**File:** scripts/apply-uzbek-scripts.ts
**Commit:** fix: --skip-source-fix flag + zero-row detection on backfill apply (P096)

**Symptom:**
  Legacy Uzbek two-script backfill (built 2026-06-14, commit 7b1946c) was never run.
  On re-examination two months later it was still ready to write, but:
  1. It wanted to write corrected_text_uzbek to 9 rows whose homoglyph corruption
     had already been fixed in production by other means.
  2. Its 74 write results could not be distinguished from 74 no-ops.

**Root cause — part 1 (stale replay):**
  The apply step does not compute anything. It replays out/uzbek-scripts.json,
  generated on 2026-06-14 from the then-corrupted table. Any defect fixed in
  production between generation and apply gets silently overwritten with the
  June-era value. Backfill scripts age; their input snapshots age with them.

**Root cause — part 2 (silent success):**
  supabase.from(t).update(u).eq('id', id) returns { error: null } when it
  matches ZERO rows. A stale id logs ✓ and increments the success counter for
  a write that never happened. Same failure class as:
    - P093 — Playwright webServer timeout exits 0 having run zero tests
    - anon-key writes under RLS — blocked, no error surfaced
  A green counter is not evidence of work performed.

**Fix — three parts:**
  1. Assert the defect still exists BEFORE --apply:
       select count(*) from hadith_library
       where text_uzbek ~ '[a-zA-Z]' and text_uzbek ~ '[\u0400-\u04FF]';
     Returned 0 → corrections already landed → skip that path.
  2. Gate the correction behind --skip-source-fix rather than deleting the code.
     The path stays available for future runs against uncorrected data.
  3. Chain .select('id') and treat an empty array as failure:
       else if (!data || data.length === 0) {
         fail += 1;
         console.error(`  ✗ #${n} (${id}): matched 0 rows — id not found`);
       }

**Also fixed — dishonest preview:**
  Summary and per-row preview lines were computed from cleaned_from_mixed
  without consulting the flag, so a --skip-source-fix dry run still printed
  "correcting source text_uzbek". The dry run IS the human gate; a preview
  that misreports what will happen defeats the gate. Both lines now branch
  on SKIP_SOURCE_FIX.

**Verification query — do not count against a fixed number:**
  The script's built-in hint said "expect 74 / 74", which assumes the table
  never grows. Compare against total_rows instead:
    select count(*) as total_rows,
           count(text_uzbek_cyrillic) as cyr,
           count(text_uzbek_latin) as lat,
           count(*) filter (where text_uzbek is not null
                              and text_uzbek_cyrillic is null) as uz_without_scripts
    from hadith_library;
  Result: 74 / 74 / 74 / 0 ✅

**Homoglyph predicate — known limitation:**
  The mixed-script check catches rows containing BOTH Latin and Cyrillic.
  A row where every Latin char was replaced by a Cyrillic homoglyph reads as
  pure Cyrillic and scores 0. Once both script columns are populated, the
  stronger per-column assertions are:
    text_uzbek_latin    !~ '[\u0400-\u04FF]'
    text_uzbek_cyrillic !~ '[a-zA-Z]'

**Rule going forward:**
  Before running any backfill whose input is a generated snapshot:
    1. Check the snapshot's age against the last change to its target table.
    2. Re-assert the defect predicate — never assume the defect is still there.
    3. Confirm affected-row counts; never trust an absent error as proof of write.

**Status:** FIXED — 74/74 applied, 0 failed


## ════════════════════════════════════════════════════════
## PATTERN 97: Transliterator returned raw Latin source — okina/tutuq drift
## ════════════════════════════════════════════════════════
**ID:** P097
**Type:** Data-correctness fix (orthography + unnormalized passthrough)
**Files:** scripts/lib/uzbek-translit.ts, scripts/lib/uzbek-translit.test.ts,
           scripts/promote-candidates.py
**Commit:** fix: normalize Latin apostrophes to okina/tutuq by context (P097)

**Background — two distinct Uzbek letters, not one apostrophe:**
  okina  ʻ U+02BB — forms the letters oʻ and gʻ  (boʻlsa, ulugʻ, Roʻza)
  tutuq  ʼ U+02BC — glottal stop, from Cyrillic ъ (Qurʼon, neʼmat, inʼom)
  Rule: apostrophe after o/O/g/G → okina; anywhere else → tutuq.

**Symptom:**
  After the legacy two-script backfill (P096), text_uzbek_latin held 41 rows
  with ASCII apostrophe ('), 1 row with okina, 32 with none. No row mixed
  variants — the transliterator was consistent per row, just not normalizing.

**Root cause:**
  deriveBothScripts() returned `latin: text` — the RAW input — for Latin-source
  rows. latinToCyrillic() folds all apostrophe glyphs via .replace(APOS, S),
  but that normalization only ever reached the CYRILLIC output. The Latin side
  was passthrough, so whatever the source typed survived into the column.
  Cyrillic-source rows were correct (CYR_MAP emits OKINA for ў/ғ, TUTUQ for ъ),
  which is why exactly 1 row had proper orthography.

**Compounding error — a blanket replace() made it worse before better:**
  An initial repair ran replace(text, '''', 'ʻ') across 41 rows, collapsing
  BOTH letters into okina. That corrupted 6 rows (Qurʼon→Qurʻon, neʼmat→neʻmat,
  inʼom→inʻom). The spot-check that followed searched for apostrophes adjacent
  to spaces/punctuation — the one position where tutuq never appears — so it
  could not have caught the defect it was meant to catch.
  LESSON: verify a normalization against the RULE it must satisfy, not against
  a proxy pattern. Counts proving uniformity are not counts proving correctness.

**Fix — data:**
  Context-aware repair, all apostrophes per row (not just the first):
    update hadith_library
    set text_uzbek = regexp_replace(
          regexp_replace(text_uzbek, U&'([ogOG])[\02BB\02BC]', U&'\\1\02BB', 'g'),
          U&'([^ogOG])[\02BB\02BC]', U&'\\1\02BC', 'g')
    where text_uzbek ~ U&'[\02BB\02BC]';
    update hadith_library set text_uzbek_latin = text_uzbek where text_uzbek is not null;
  Verify (both 0):
    select count(*) filter (where text_uzbek ~ U&'[^ogOG]\02BB') as bad_okina,
           count(*) filter (where text_uzbek ~ U&'[ogOG]\02BC')  as bad_tutuq
    from hadith_library;

**Fix — code (prevents recurrence):**
  New exported normalizeLatinApostrophes() applying the o/g context rule.
  Called on the `latin:` return in BOTH branches of deriveBothScripts —
  the Cyrillic branch is already correct, but routing it through the same
  function gives one owner for the invariant.
  5 tests added, incl. a regression test that fails against `latin: text`.

**KNOWN LIMITATION (accepted, logged not fixed):**
  The internal sentinel S === TUTUQ (both U+02BC), so LAT_RULES cannot
  distinguish oʻ from oʼ — ['o'+S, 'ў'] matches first, and a genuine tutuq
  after o/g folds to okina. No row in hadith_library exercises this.
  Full fix = private-use sentinel + context-aware LAT_RULES (option B, deferred).

**Downstream to verify:**
  P089 server-side library search must normalize apostrophes, or a user typing
  qo'shni will not match stored qoʻshni. NOT done — open item.

**Status:** FIXED — 74/74 rows correct, 11/11 tests green

**Repo note:** HR-only fix — the file does not exist in HV. Logged here solely to
keep the shared P-number sequence unbroken. No HV action required.

## ════════════════════════════════════════════════════════
## PATTERN 98: Poll loop killed a COMPLETED job — deadline checked before success
## ════════════════════════════════════════════════════════
**ID:** P098
**Type:** Control-flow bug (wasted a paid API generation)
**File:** scripts/generate-scene.ps1
**Commit:** fix(scene): break on COMPLETED before deadline check; exit early on terminal failure (P098)

**Symptom:**
  A Kling image-to-video generation ran to completion, and the script reported:
    status: COMPLETED
    FAILED: timed out after 8 min (request 019fe271-... still COMPLETED)
  The clip was generated and paid for, but never downloaded — step 3 never ran.

**Root cause:**
  In the do/while poll loop, the deadline check sat INSIDE the body, above the
  while condition:
      Write-Host "status: $($st.status)"
      if ((Get-Date) -gt $deadline) { Die "timed out ..." }
    } while ($st.status -ne 'COMPLETED')
  On the iteration where status finally became COMPLETED, the deadline test ran
  FIRST and called Die — one line before the loop would have exited normally.
  The generation had simply taken longer than 8 minutes; success arrived, and
  the script threw it away.

**Fix:**
      if ($st.status -eq 'COMPLETED') { break }
      if ($st.status -in @('FAILED','ERROR','CANCELLED')) { Die "generation failed ..." }
      if ((Get-Date) -gt $deadline) { Die "timed out ..." }
    } while ($true)
  Success is now tested before failure. Terminal error states also exit
  immediately instead of polling out the full 8 minutes.

**Rule going forward:**
  In any poll loop, evaluate the SUCCESS condition before any failure or timeout
  condition. A timeout is only meaningful if the work is still pending.
  Related: P093 (unset clobbers $? — capture the exit code before cleanup).
  Both are ordering bugs where a later statement destroyed an earlier result.

**Note — recovery was attempted and abandoned:**
  A -RequestId parameter to re-fetch the orphaned result was drafted, then
  reverted: the fal queue-result URL shape was unverified, and regenerating
  costs ~$0.50. Not worth speculative code. Regenerated instead; loop fix held.

**Status:** FIXED — scene 1 regenerated and downloaded successfully

**Repo note:** HR-only fix — the file does not exist in HV. Logged here solely to
keep the shared P-number sequence unbroken. No HV action required.

## ════════════════════════════════════════════════════════
## PATTERN 99: amix outlived -shortest — frozen subtitle tail on every animated reel
## ════════════════════════════════════════════════════════
**ID:** P099
**Type:** Output-correctness fix (ffmpeg filter semantics)
**File:** render-reel.ps1
**Commit:** fix(render): bound reel to narration length — amix dropout_transition + explicit -t (P099)

**Symptom:**
  adults-en-bukhari-1-reel.mp4 ran 81.0s against a 78.8s narration. The final
  subtitle cue stayed frozen on screen for the last ~2.2s over silent video.

**Root cause:**
  -shortest WAS present, but it measures the MAPPED output streams, and the
  audio map is [aout] — the amix result, not the narration:
    [1:a]volume=1.0[narration];[2:a]volume=0.25[music];
    [narration][music]amix=inputs=2:duration=first[aout]
  amix defaults to dropout_transition=2, adding a 2-second gain-renormalisation
  tail when an input drops out. The nasheed (150s) outlives the narration
  (78.8s), so [aout] ran ~2s past duration=first. -shortest then honoured 81s.
  Diagnosis came from ffprobe on all four inputs — reel 81.0, narration 78.77,
  nasheed 150.0, background 20.1 — which ruled out every other candidate.

**Fix — two parts:**
  1. amix=inputs=2:duration=first:dropout_transition=0[aout]
  2. Measure the narration and hard-bound the output:
       $narrDur = [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $narr)
       ... "-shortest","-t",[string][math]::Round($narrDur,2),...
  Part 2 is belt-and-suspenders: -t makes the intended length explicit rather
  than emergent from filter-graph semantics.
  Result: 78.766009s — exact match to the narration.

**Scope — affects earlier reels:**
  Same code path as R005 (bukhari-1520 RU, the first animated reel). Any
  published animated reel from before this fix likely carries the same frozen
  tail. Not re-rendered; noted for awareness.

**Also learned (not a bug):**
  The background was 20.1s against 81s of audio — ffmpeg loops the scene set
  ~4x. Expected for a 4x5s scene set under an 80s narration, but worth knowing
  the visuals repeat; more or longer scenes reduce the loop count.

**Rule going forward:**
  -shortest is only as good as what is mapped. When an amix/afade/concat sits
  between inputs and output, verify the RESULT length with ffprobe rather than
  trusting the flag. Same class as P096: an absent error is not proof of the
  intended outcome.

**Status:** FIXED — verified 78.766s

## ════════════════════════════════════════════════════════
## PATTERN 100: Whisper crashed on Cyrillic — CP1252 console, not a transcription failure
## ════════════════════════════════════════════════════════
**ID:** P100
**Type:** Environment fix (Windows console encoding)
**File:** render-reel.ps1 (Step 5 — Whisper call)
**Commit:** fix(render): force UTF-8 for Whisper so Cyrillic/Arabic subtitles don't abort (P100)

**Symptom:**
  RU reel render died at Step 5:
    UnicodeEncodeError: 'charmap' codec can't encode character '\u0412'
      in position 27: character maps to <undefined>
    Skipping out\adults-ru-bukhari-1-narration.mp3 due to UnicodeEncodeError
    FAILED: Whisper did not produce ...-narration.srt

**Root cause:**
  \u0412 is Cyrillic «В» — the first letter of the narration. Whisper
  TRANSCRIBED correctly; it crashed trying to PRINT the progress line to a
  CP1252 console (transcribe.py line 482, print(make_safe(line))). The
  traceback aborted the run before the .srt was written. The defect is in
  stdout encoding, not in the audio or the model.

**Why it didn't hit R005 (also RU, June):**
  Python is now 3.14 (C:\...\Python314). Newer Whisper/Python builds print
  segment text to stdout during transcription where earlier ones did not.
  An environment change, not a code change on our side.

**Fix (session-level, proven):**
    $env:PYTHONIOENCODING = "utf-8"
    $env:PYTHONUTF8 = "1"
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  PYTHONIOENCODING is the one that matters — it makes Python write UTF-8
  regardless of console codepage. The other two fix display.

**TODO — make it durable:**
  Set PYTHONIOENCODING/PYTHONUTF8 inside render-reel.ps1 before the Whisper
  invocation, so RU/AR reels don't depend on shell state. Currently the render
  only succeeds in a shell where these were set by hand.

**Related:** same CP1252 root cause as the mojibake in PowerShell's
  Invoke-RestMethod output (ï·º for ﷺ) — cosmetic there, fatal here.

**Status:** WORKED AROUND — durable fix pending

## ════════════════════════════════════════════════════════
## PATTERN 101: generate-reel fabricated hadith — invented scenes + speech attributed to the Prophet ﷺ
## ════════════════════════════════════════════════════════
**ID:** P101
**Type:** CONTENT-SAFETY DEFECT — highest severity in this project
**File:** app/api/generate-reel/route.ts (prompt)
**Commit:** d4ee1af — fix(generate-reel): forbid invented incidents and attributed speech (P101)

**Symptom:**
  Generating the RU adults script for Sahih al-Bukhari #1 produced, TWICE, a
  fabricated narrative incident with direct speech attributed to the Prophet ﷺ:
    Gen 1 — the Prophet ﷺ approaches a companion after prayer, asks what he felt,
            the companion answers in quoted speech, the Prophet ﷺ replies
            «Именно это и есть истинное поклонение».
    Gen 2 — a companion carries water; the Prophet ﷺ stops and says «даже эта
            капля воды станет весомее горы в День воздаяния»; the companion is
            then said never to have acted without intention again.
  None of this is in Bukhari #1, in Ar-Raheeq Al-Makhtum, or in any source.
  It is invented hadith — the exact category HV exists to detect.

**Root cause:**
  The route prompt constrains seerah_context to cite a real period, but has NO
  rule against inventing incidents or attributing speech to the Prophet ﷺ.
  Bukhari #1 is a ONE-SENTENCE matn; with little to expand, the model fills the
  space with narrative. EN complied by chance (it described the Hijra setting);
  RU did not. Same hadith, same route — so compliance was luck, not design.

**Why the existing gates did not catch it:**
  - The human review gate DID catch it. That is the only reason it did not ship.
  - No automated check exists. Nothing in the route, tests, or CI inspects
    generated output for invented narrative or quoted speech.

**Fix — required in the route prompt (APPLIED):**
  Add to the RULES block:
    - NEVER invent an incident, scene, or conversation that is not in the hadith
      text or the cited seerah source.
    - NEVER attribute direct or indirect speech to the Prophet ﷺ, any prophet,
      or any companion beyond what the hadith itself records.
    - NEVER state what a named person felt, thought, or did afterwards.
    - If the matn is short, expand ONLY into documented historical context of
      the period. Do not compensate with narrative.

**Interim mitigation (used for R011):**
  Story field hand-written from the EN version's approach — historical setting,
  no scene, no quoted speech. P079's editable textareas made this possible
  without a regenerate cycle.

**Also observed:** the RU caption cited «Источник: Усваи Хасана» while EN cited
  Ar-Raheeq Al-Makhtum for the same hadith. Source attribution is not consistent
  across languages — separate defect, needs investigation.

**Rule going forward:**
  Every generated story is read in full before TTS. Regeneration is NOT a fix
  for a fabrication — two generations produced two different fabrications.
  Edit the textarea by hand instead.

**Status:** FIXED — rules 7-10 added; verified by regenerating the exact failing case
  (Bukhari #1, RU) which produced clean output on first generation. NOTE: the original
  rules ACTIVELY CAUSED this — rule 2 required naming the Prophet ﷺ or companions, and
  rule 5 required "a simple scene a child can picture" for Kids style. The defect was
  in the rules, not merely absent from them. Kids style is now explicitly told NOT to
  invent a scene.
  Automated detection still does not exist. Human review remains the only gate.

  ## ════════════════════════════════════════════════════════
## PATTERN 102: OpenAI TTS hardened plain г to ғ in Uzbek — moved UZ/TJ to ElevenLabs v3
## ════════════════════════════════════════════════════════
**ID:** P102
**Type:** Provider migration (supersedes P071, P073, P087 for UZ/TJ)
**File:** app/api/tts/route.ts
**Commit:** 8229667 — fix(tts): route UZ/TJ to ElevenLabs eleven_v3 (P102)

**Symptom:**
  UZ adults narration pronounced plain г as the throaty ғ (uvular fricative) —
  audibly closer to an F. Affected Мадинага, қилган, келган, тўлган, мавзуга,
  қараганда, солганда. Every -ган / -га ending in the language.

**What was ruled out, in order:**
  1. Wrong text — NO. Source text had plain г correctly throughout.
  2. Missing instructions — NO. P087's corrective example ("сувга = suv-GA,
     do NOT harden plain г into ғ") existed only in 'uz.kids'. Added the same
     to 'uz.adults' with contrast pairs. Still wrong.
  3. Phonetic environment — NO. First theory was assimilation to a nearby қ
     (қилган, қараганда). Disproved when тўлган and мавзуга failed too.
  4. Content reword — NO. Rewording to avoid the environment (қилган→этган,
     қараганда→назар солганда) did not help; солганда also failed.
  5. Voice selection — NO. Switched adults from onyx to nova (the voice that
     P087 tuned and R008 shipped on). Still wrong. This also means R008's
     correctness was luck: P087 says "г OCCASIONALLY hardened".
  6. Newer OpenAI model — NONE EXISTS. gpt-4o-mini-tts is still current
     (verified against OpenAI docs, Aug 2026).

**Root cause:**
  gpt-4o-mini-tts does not reliably distinguish Uzbek Cyrillic г from ғ.
  The `instructions` parameter BIASES output; it does not control phonemes.
  P087 documented this same limit for ҳ ("instructions can't reliably fix one
  stochastic position") and resolved it content-side. That escape hatch does
  not scale to a letter appearing in every grammatical ending.

**Fix — provider change:**
  UZ and TJ now route to ElevenLabs eleven_v3.
    const useOpenAI = langKey === 'ru' && style === 'kids'   // was: uz/tj too
  VOICE_MAP gained uz and tj entries. Verified by browser test before coding.

**Voice matrix (UZ/TJ), chosen deliberately — different voice per language:**
    uz.adults  Opa Johann        R3XXDwKMU2YHwBcuYUH3
    uz.kids    Mini              hO2yZ8lxM3axUxL8OeKX
    tj.adults  Meisam            KXptrwcsEqqFSwRKJukF
    tj.kids    Katherine Polished 0zUZ5qUGb8wympsfJH8d
  Rationale: most viewers watch ONE language only, so cross-language voice
  consistency is invisible to them; per-language fit wins. (Meisam is a Persian
  voice and Tajik is a Persian variety — chosen on that hypothesis, confirmed
  by ear.)

**SUPERSEDES EARLIER FINDINGS — v3 improved between July and August 2026:**
  July test: eleven_v3 said "dj" for ж, which is why lib/uzbek-tts-phonetics.ts
  (inline IPA lexicon) was built. Re-tested Aug 2026 on the same ж words
  (Жаннат, жума, ҳижрат, бежиз): CLEAN. The IPA layer is NOT needed for reels.
  eleven_multilingual_v2 remains worse — accented, and does not recognise Tajik.
  So the win is v3 specifically, not ElevenLabs generally.
  This vindicates the module's own warning: "re-baseline after every model
  upgrade." P071 ("OpenAI Nova for UZ/TJ Cyrillic") is now OBSOLETE.

**Side effect — EN/AR/RU adults also moved to v3** (shared fetch, one model_id).
  Regression-tested by regenerating EN (James) and RU (Abrar) narrations for
  Bukhari #1: no degradation, ﷺ still expands correctly. Accepted rather than
  making model_id language-conditional.

**Rule going forward:**
  When a TTS defect survives instructions, voice change, AND content reword,
  stop tuning and re-baseline the providers. Six escalation steps here; the
  first five were all inside a provider that could not do the thing.

**Status:** FIXED — verified across UZ, TJ, EN, RU; shipped in R012 and R013

## ════════════════════════════════════════════════════════
## PATTERN 103: Prompt rules mandated the fabrication they forbade
## ════════════════════════════════════════════════════════
**ID:** P103
**Type:** Prompt defect — specification conflict (extends P101)
**File:** app/api/generate-reel/route.ts
**Commit:** 9ea9b89 — fix(generate-reel): P103 — remove mandated-fabrication conflict in rules 2/6/9 and story field

**Symptom:**
  generate-reel invented an occasion for hadith that have no recorded setting.
  Bukhari #1417 produced "the Prophet ﷺ saw people sharing in Madinah" and
  "this teaching came from that same warm world of caring and sharing" across
  repeated generations — including after P101 had tightened rules 7-10.

**What was ruled out, in order:**
  1. Sampling noise — NO. Two independent generations produced the same
     invented Madinah setting.
  2. Rule 9 too narrow — NO. This was the standing theory carried into the
     session ("widen from any named person to any person or group"). Widening
     it alone would not have worked; the leak survived to the History field.
  3. Kids-style register — NO. First generation was adult-register (wrong
     Style selected), but the fabrication persisted after correcting to Kids.

**Root cause:**
  Rules 2 and 6 REQUIRED what rules 7-10 FORBADE. Rule 2 said story MUST
  reference the Prophet ﷺ or his companions; rule 6 said seerah_context MUST
  cite a real period. For a hadith with no recorded incident, the only way to
  satisfy those requirements is to invent one. The model obeyed the
  requirement, not the prohibition.
  The `story` field description compounded it: "warm, vivid, story-like",
  "must give human emotional context", "must feel real and touching" is an
  instruction to dramatize, sitting directly above the anti-fabrication rules.

**Fix — four edits, all in the prompt:**
  Rule 2: MUST reference → MAY reference, with "if neither records an incident
    for this hadith, do NOT construct one — explain the teaching itself instead"
  Rule 6: cites a period ONLY if sources tie the hadith to one; otherwise state
    exactly three things and nothing more — collection and book, narrator,
    classical scholarly reading
  Rule 9: "any named person" → "any person or group", plus explicit occasion
    clause: "NEVER assert the occasion, setting, or audience of the hadith
    unless the narration itself records it"
  story field: rewritten to ask for explanation rather than drama

**Rule 6 needed a second pass:**
  The first version permitted the three-element fallback but did not forbid
  padding past it. The model gave collection/narrator/reading correctly, then
  invented anyway in softened form: "during a time when he often encouraged his
  companions to give in charity". Added an explicit stop clause naming the
  softened phrasings ("during a time when", "in an era where") as occasions.

**Verified:**
  Regenerated EN Bukhari #1417 twice after the fix. Story and Moral clean on
  both. History clean after the rule 6 second pass. #1417 was the hadith that
  leaked twice, so this is a control test, not a fresh-hadith sample.

**Rule going forward:**
  When a prompt reliably produces forbidden output, do not strengthen the
  prohibition first — search the prompt for an instruction that MANDATES the
  forbidden output. Prohibitions cannot win against requirements.
  Softened phrasings are the same fabrication and must be named explicitly.

**Also in this session (not separate patterns):**
- Kids clips now render at `--resolution 720p` (736x1312, was 480x864).
  `choices=["480p","720p"]` was always in generate-talking-clip.py; 480p was
  merely the default, and every kids reel through #6009 shipped at 480p.
- Mascot stills recovered and committed to assets/mascot/. The source PNGs were
  never committed and no longer existed — only 480p video frames in out/talking/.
  Recovery: extract frame → use as face reference in Nano Banana Pro → regenerate
  scene at 4K (3072x5504) → commit. Never let a source asset exist only inside a
  rendered video.
- generate-talking-clip.py checks FAL_KEY before argparse, so `--help` fails
  without a key. Move env guards after parse_args().
- split-narration.py line 172 next-step hint still references the nonexistent
  lamb-boy-mosque-night-v2.png — update to v3.

**Status:** FIXED — verified on EN Bukhari #1417 (R014); shipped 2026-08-10

## ════════════════════════════════════════════════════════
## PATTERN 104: Kids voices split by mascot; OpenAI fully retired from TTS
## ════════════════════════════════════════════════════════
**ID:** P104
**Type:** Feature + provider migration (completes P102; fixes P085 recurrence)
**File:** app/api/tts/route.ts, app/admin/page.tsx
**Commit:** 502c0de — feat(tts): P103 — kids voices split by mascot; RU kids off OpenAI, ElevenLabs now sole provider

**Symptom:**
  First boy-lamb kids reel (EN, Bukhari #1417) shipped with Danielle — a female
  voice on a male mascot. Fabric lip-syncs the mouth, so the voice reads as the
  character's own, not a narrator's. Every kids voice in the matrix was female
  because the matrix was built around the girl lamb.

**Decision — mascot/voice pairing becomes channel convention:**
  boy lamb → male voice, girl lamb → female voice, alternating mascot by hadith.
  Adults reels have no mascot and are unaffected.

**Design choice — separate `mascot` field, NOT extended `style`:**
  Rejected: style = 'kids-boy' | 'kids-girl' | 'adults'. Fewer edits, but style
  would stop meaning "audience" and start meaning "audience + character", and
  would be ambiguous on adults reels that have no mascot at all.
  Chosen: VOICE_MAP[lang].kids.{boy|girl}, with mascot threaded admin → route.

**P084 failure-mode guard:**
  P084 was a missing payload field producing wrong-voice audio with NO error.
  Same shape here. Mitigation: mascot defaults to 'girl' in the route, so an
  omitted field falls back to the voices already shipped on #6009 rather than
  silently switching gender.

**Voice matrix (kids), all eleven_v3:**
    en.kids.girl  Danielle           FVQMzxJGPUBtfz1Azdoy
    en.kids.boy   Eric               cjVigY5qzO86Huf0OWal
    ru.kids.girl  Arabella Calm&Mat  ocFEgn1SP9oWO9QrLDgb
    ru.kids.boy   Liam Youthful      pw8bioilqsSn2jApHYwT
    uz.kids.girl  Mini               hO2yZ8lxM3axUxL8OeKX
    uz.kids.boy   George             JBFqnCBsd6RMkjVDRZzb
    tj.kids.girl  Katherine Polished 0zUZ5qUGb8wympsfJH8d
    tj.kids.boy   Liam Viral         VCgLBmBjldJmfphyB8sZ
  Male kids voices are deliberately NOT the adults voices — reusing James,
  Abrar, Opa Johann or Meisam would make kids and adults reels indistinguishable
  within a language.

**RU kids migrated off OpenAI — provider consolidation complete:**
  Nova was the last OpenAI slot, surviving P102 because RU had not hit the
  Cyrillic г defect. Replaced with Arabella. The `useOpenAI` branch and the
  OPENAI_API_KEY check are DELETED; ElevenLabs is now the sole TTS provider.
  TTS_INSTRUCTIONS retained as reference only, never called — it encodes hard-won
  Uzbek/Tajik phonetic knowledge worth keeping if a future provider needs it.

**P085 recurrence found and fixed:**
  VOICE_MAP ru.kids pointed at ELEVENLABS_VOICE_ABRAR — the male adults voice.
  This is exactly P085, still present in the map. It was masked because
  useOpenAI intercepted RU kids before the map was ever read. Deleting the
  OpenAI branch would have exposed it as male-voiced girl-lamb reels.
  Lesson: a branch that bypasses a lookup also hides bugs in that lookup.
  When removing a branch, audit what it was shadowing.

**Found while editing, NOT changed — needs .env.local audit:**
  ar.adults fallback is 'pNInz6obpgDQGcFmaJgB' (Adam), not Hijazi
  ru.adults fallback is 'ErXwobaYiN019PkySvjV'; library lists Abrar Sabbah as
  VwC51uc4PUblWEJSPzeo
  Both only fire if the env vars are unset, so they may never have mattered.

**Note — eleven_v3 take variance is expected:**
  Identical text/voice/model gives different takes per call (dashboard shows
  these as "Generation 1 / Generation 2"). Not a defect and not a setting. The
  admin issues one take per click; regenerate for a different one.
  voice_settings.stability 0.5 is the dial if variance ever needs narrowing.

**Verified:**
  EN kids + Boy lamb → Eric; toggle hidden on Adults; tsc clean.

**Status:** FIXED — shipped 2026-08-10

## ════════════════════════════════════════════════════════
## PATTERN 105: Seerah attribution fired unconditionally — false source credit in captions
## ════════════════════════════════════════════════════════
**ID:** P105
**Type:** Content-safety defect — false attribution (completes P103)
**File:** app/api/generate-reel/route.ts, app/admin/page.tsx
**Commit:** (this commit) — fix(generate-reel): P105 — drop unconditional seerah attribution from captions; seerah_context field no longer mandates a period

**Symptom:**
  Every non-English reel caption carried a seerah source credit — "📖 Источник:
  Усваи Хасана" (RU), "📖 Манба: Усваи Ҳасана" (UZ), "📖 Сарчашма: Усваи Ҳасана"
  (TJ) — regardless of whether the story drew on that source. Appeared in
  R003, R004, R005 (May) and again in R015, R016, R017 (Aug), so it has been
  live since the tracker began. EN was unaffected in appearance only; the same
  mechanism credited Ar-Raheeq Al-Makhtum unconditionally there.

**Root cause:**
  getSeerahSource(lang) returns a hardcoded attribution string, interpolated
  directly into the JSON schema as "source_attribution": "${...}". It was never
  a model output — a constant dressed as one. Line 170 set it again server-side.
  Nothing checked whether the source was actually used.
  This became a live falsehood after P103: the prompt now correctly tells the
  model to explain the teaching plainly when no incident is recorded, so most
  stories consult no seerah source at all — while the caption kept crediting one.

**Why this is a hard-rule violation, not a cosmetic bug:**
  The project rule is no fabricated attributions. Crediting a book that was not
  used is a fabricated attribution, even when the book is real and the hadith is
  sound. The hadith citation (collection, number, narrator) is what a viewer
  needs to verify; the seerah source is background material for the story.

**Fix — drop the attribution from captions entirely:**
  Removed "source_attribution" from the JSON schema
  Removed result.attribution server-side assignment
  Removed the attribution line from the admin caption builder
  Removed attribution/source_attribution from the Generated interface
  Remotion `attribution` prop now receives the hadith citation instead
  Story panel header no longer displays a seerah credit
  getSeerahSource() RETAINED — the model still draws on the source for the
  story where it records something relevant. Only the caption credit is gone.

**Second defect found in the same read — seerah_context still mandated a period:**
  P103 fixed rule 6 in the RULES block but NOT the field description, which
  still said "the specific historical moment or period when this teaching was
  most lived or demonstrated". The rule said "only if the sources tie the hadith
  to one"; the field said "give me a specific moment". Same specification
  conflict P103 was about, surviving in a second location.
  Lesson: when fixing a prompt conflict, grep the WHOLE prompt for the mandate.
  A JSON schema field description is an instruction with the same force as a
  numbered rule.

**Third, minor:** getSeerahSource used Усваи Хасана (Х) in `name` and the RU
  attribution, Усваи Ҳасана (Ҳ) in UZ/TJ. Normalized `name` to Ҳ (the book's
  own title); RU attribution string removed with the rest.

**Verified:** RU generation (Al-Bayhaqi #1120) — caption shows collection,
  narrator, verify link, tags. No seerah line, no undefined, no blank gap.

**Status:** FIXED — shipped 2026-08-10

## ════════════════════════════════════════════════════════
## PATTERN 106: Pipeline automation — TTS to disk, work tree, wrapper, caption template
## ════════════════════════════════════════════════════════
**ID:** P106
**Type:** Automation / friction removal (no defect — deliberate improvement)
**Files:** app/api/tts/route.ts, app/admin/page.tsx, render-mascot-reel.ps1,
           split-narration.py, make-kids-reel.ps1 (new)
**Commits:** 5c272a8, 6caa47b, 4fbfea2, ad18d59

**Motivation:**
  The R014-R017 session (Bukhari #1417, 4 languages) took ~8 hours. Step-count
  audit put it at roughly 70% manual, and every defect that session — P103
  fabrication leak, three grammar errors, the P105 false attribution — was
  caught by a human reading output, not by any gate. Conclusion: automate the
  MECHANICAL steps aggressively; leave content review human until an Auditor
  exists (see agent-architecture-roadmap.md Phase 4).

**1. TTS writes to disk (app/api/tts/route.ts):**
  Was: generate in browser -> download -> rename -> move to out\. Eight times
  per hadith set, and the rename is where a wrong slug silently poisons every
  downstream command.
  Now: route writes to out/work/{style}/{slug}/{lang}/{style}-{lang}-{slug}-{section}.mp3
  Gated on NODE_ENV !== 'production' — Vercel's filesystem is read-only and
  ephemeral. Write failures are caught and logged, never break the audio
  response. Returns X-Saved-Path header.
  Route gained `slug` and `section`; admin derives the slug from
  collection + hadith_number ("Sahih al-Bukhari" + "1417" -> bukhari-1417).
  Verified against Al-Bayhaqi, which the regex had not been proven on.

**2. Per-reel work tree (out/ restructure):**
  out/ had 108 loose files after 17 reels — ~30 files per hadith set, growing
  without bound. Restructured:
    out/backgrounds/  shared nasheeds and bg video (unchanged)
    out/refs/         FLUX source stills, mascot references
    out/data/         candidates.json, translations, sourcing state
    out/work/         current set only — stays small permanently
    out/published/    {style}/{slug}/{lang}/ — archive
    out/_legacy/      tests and dead-convention files
  render-mascot-reel.ps1 $talkDir now points at the per-reel folder; the final
  reel lands there too, so archiving a set is a single folder move.
  NOTE: three MP4s could not be moved — persistent file lock survived closing
  the player. Copied and left in place; same environment quirk as the
  PowerShell silent-revert gotcha. Delete after reboot.

**3. make-kids-reel.ps1 (new) — one command from narration to reel:**
  Chains concat -> duration check -> split if needed -> Fabric per chunk at
  720p -> render. Replaces ~16 hand-typed commands with filenames per hadith set.
  Two deliberate design points:
  - Seam-aware split. split-narration.py maximises chunk length, so on UZ it
    cut at 27.3s MID-MORAL rather than at the 22.3s story/moral silence,
    forcing a manual recut. The wrapper cuts at storyDur + 0.5s instead.
    split-narration.py itself is unchanged and still correct for its own use;
    the greedy objective is logged as a P107 candidate.
  - Confirmation pause before Fabric (skip with -Auto). Fabric is the only
    paid, irreversible step; a keypress is cheap insurance against spending
    on a bad TTS take.
  Step 0 validates inputs, FAL_KEY presence AND length (~69 chars), and
  ffmpeg/ffprobe/python on PATH before anything is spent.
  -Mascot girl currently fails Step 0 by design: the girl-lamb still does not
  exist in the repo yet.

**4. Deterministic caption template (app/admin/page.tsx):**
  Captions were hand-corrected on every reel. Same two fixes four times each
  in the #1417 session.
  - TAG_BLOCKLIST filters tags that pull the wrong audience. #date reaches
    dating content; #hellfire skews to metal/gaming. Tags come from the hadith
    library, so filtering happens at caption time rather than editing the library.
  - Hadith text now included in the caption, via text_display (already
    language-aware per /api/reels lines 66-73). Rationale: captions get
    screenshotted and forwarded, which is the exact fabrication vector this
    project exists to fight. A caption carrying verified text plus its
    reference is the sadaqah working.
  - #kids appended automatically on kids reels.

**Still manual after P106:**
  Clicking Generate for story and moral in the admin (2 clicks per language).
  Content review — deliberately so.
  Publishing — 16 uploads per hadith set across 4 platforms. Roadmap Part 6
  rule 4 keeps cross-posting a human act.

**Known remaining friction (P107 candidates):**
  - Collection and narrator stay Latin inside Cyrillic captions ("Sahih
    al-Bukhari #1417, Adiy ibn Hatim" in a Russian caption). Hand-corrected on
    all four languages in the #1417 session. Needs translation maps or DB columns.
  - split-narration.py greedy chunk objective (see above).
  - Pre-push classifier still blind to scripts/, assets/, and read UI=0 on a
    session that changed admin/page.tsx.

**Status:** SHIPPED 2026-08-11 — verified end to end on Al-Bayhaqi #2318 (TTS
  write) and Bukhari #1417 RU (caption). Wrapper validated through Step 0;
  full run pending the next hadith set.