## ════════════════════════════════════════════════════════
## PATTERN 37: Hallucination URL test — locator too broad
## ════════════════════════════════════════════════════════
**ID:** P037
**Type:** Test fix (locator scope)
**Commit:** fix: scope source link locator to result panel — CI #122
**Symptom:**
  - hadith-verifier.spec.ts:171 — Hallucination detection test fails
  - expect(VALID_SOURCE_DOMAINS.some(d => href?.includes(d))).toBe(true)
  - Expected: true  Received: false
  - CI #122 red

**Root cause:**
  `page.locator('a[href^="https://"]').first()` grabs the FIRST https://
  link on the entire page — which after adding the HadithReels banner and
  cross-links could be hadithreels.com, hadithverifier.com, or any nav/footer
  link — none of which are in VALID_SOURCE_DOMAINS.
  The test was accidentally validating the wrong link.

**Fix — scope locator to result panel:**
```ts
// WRONG — grabs first https:// link on entire page:
const links = page.locator('a[href^="https://"]')
const href = await links.first().getAttribute('href')
expect(VALID_SOURCE_DOMAINS.some(d => href?.includes(d))).toBe(true)

// RIGHT — scope to main result panel, check ALL source links:
await page.waitForSelector('text=/verified sources/i', { timeout: 90000 })
const resultPanel = page.locator('main').first()
const sourceLinks = resultPanel.locator('a[href^="https://"]')
const count = await sourceLinks.count()
expect(count).toBeGreaterThan(0)
let foundValidSource = false
for (let i = 0; i < count; i++) {
  const href = await sourceLinks.nth(i).getAttribute('href')
  if (href && VALID_SOURCE_DOMAINS.some(d => href.includes(d))) {
    foundValidSource = true
    break
  }
}
expect(foundValidSource).toBe(true)
```

**Also wait for:** `text=/verified sources/i` — ensures result panel is
fully rendered before querying links inside it.

**Status:** FIXED
