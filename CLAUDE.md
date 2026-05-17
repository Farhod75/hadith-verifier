# CLAUDE.md
# Project constitution for hadith-verifier
# Auto-loaded by Claude Code on every session
# Last updated: 2026-05-17

---

## 🧑 WHO

**Developer:** Farhod Elbekov — SDET / AI QA Engineer, Charlotte NC
**Stack:** Next.js 14 + TypeScript + Anthropic Claude API + Supabase + Vercel + Tailwind
**Tests:** 180 Playwright (TS) + 36 pytest (Python) — CT-GenAI aligned
**Live:** https://hadithverifier.com
**Repo:** github.com/Farhod75/hadith-verifier
**Built as:** sadaqah jariyah — free, no ads, for the Muslim community

---

## 🎯 PROJECT GOAL

AI tool detecting fabricated or weak hadiths on social media (FB, Instagram, WhatsApp, Telegram).

**Features:**
- Multi-tab UI: Analyze / Dua Corrector / Sources / Admin Queue
- 5 languages: EN, UZ, AR, RU, TJ
- Severity scoring: CRITICAL / HIGH / MEDIUM / LOW
- OCR via Claude Vision (screenshot uploads)
- Telegram bot + Slack alerts
- Admin queue for human review
- Source authority tiers (Tier 1: Dorar.net, Sunnah.com; Tier 2: IslamQA, Yaqeen)

---

## 🚨 HARD RULES (NEVER VIOLATE)

### 1. Architecture Philosophy
- **AI flags, humans decide.** NEVER auto-delete posts. NEVER auto-ban users.
- Supabase stores flagged posts AFTER analysis — admin queue only, not source of truth.
- Prompt-based AI for hadith verification — Claude training knowledge is the source.
- No RAG for hadith content (yet — Phase 1 of RAG roadmap will add Dorar.net PDFs).

### 2. Security
- ALWAYS use `sanitizeInput()` before passing user text to Claude API.
- ALWAYS run `validateOutput()` on Claude responses before returning to client.
- `TRUSTED_DOMAINS` whitelist enforced on all URL submissions.
- Rate limit: 100 requests/day/IP (generous for users, blocks abuse).

### 3. Supabase RLS (FP-001 — CRITICAL)
- RLS policies silently block reads if misconfigured.
- ALWAYS test with: `select * from flagged_posts;` directly in SQL editor BEFORE assuming code bug.
- Test with anon key + authenticated key separately.

### 4. Environment Variables
- NEVER commit `.env*` files. `.env.example` only with placeholder values.
- Vercel env vars MUST be set in dashboard before deploy — placeholders survive otherwise (FP-002).
- After env change → `vercel --prod --force` (FP-005).
- Watch for double `https://` in Supabase URL (FP-003).

### 5. Boolean Filters (FP-004)
- NEVER use `.eq('reviewed', false)` if column allows NULL — it skips NULL rows.
- Use `.or('reviewed.is.null,reviewed.eq.false')`.

### 6. Accessibility (FP-006)
- NEVER use `text-gray-400` for body content — fails WCAG 2.1 AA (2.53:1 contrast).
- Use `text-gray-600` minimum. Run `axe-core` in CI.

### 7. CT-GenAI Test Patterns
- Severity bucket consistency: same input → same severity across 5 runs.
- Non-determinism: temperature variance ≤ 0.1 between identical prompts.
- Hallucination detection: every reference URL must resolve (200 OK) + be in TRUSTED_DOMAINS.
- Multilingual parity: same input in EN/UZ/AR/RU/TJ → same severity bucket.

### 8. UZ Language (P029)
- UZ switches between Latin and Cyrillic depending on user device.
- Assertions MUST accept both scripts: `expect(text).toMatch(/(salom|салом)/i)`.

---

## 🧰 STACK & FILES

### Core
- `app/api/analyze/route.ts` — main Claude API call, rate limiting, validation
- `app/api/dua-correct/route.ts` — Dua correction endpoint
- `app/api/admin/queue/route.ts` — admin review queue
- `lib/sanitize.ts` — input sanitization
- `lib/validate.ts` — output validation, TRUSTED_DOMAINS check
- `lib/severity.ts` — CRITICAL/HIGH/MEDIUM/LOW scoring

### Components
- `components/AnalyzeTab.tsx`, `components/DuaCorrectorTab.tsx`
- `components/SourcesTab.tsx`, `components/AdminQueueTab.tsx`
- `components/LanguageSwitcher.tsx` — 5 languages

### Tests
- `tests/playwright/` — 180 TypeScript tests
  - `analyze.spec.ts`, `dua.spec.ts`, `admin.spec.ts`
  - `multilingual.spec.ts` — EN/UZ/AR/RU/TJ
  - `severity-consistency.spec.ts` — non-determinism tests
  - `references.spec.ts` — URL validation, TRUSTED_DOMAINS
  - `accessibility.spec.ts` — axe-core WCAG 2.1 AA
- `tests/pytest/` — 36 Python tests
  - LLM evaluation harness (correctness, safety, consistency 0-1.0 scale)
  - Rate limit tests
  - Telegram bot integration

### Bot
- `bot/telegram-bot.py` — hosted on Railway
- Triggers Slack alerts for CRITICAL severity

### Documentation
- `QA_STANDARDS.md` — testing standards (this file's source of truth for QA rules)
- `FIX_PATTERNS.md` — 32+ patterns (P001-P032)
- `ABOUT.md` — developer context

---

## 📋 PRE-FLIGHT CHECKLIST (Run at START of every session)

```bash
# 1. Read constitution
cat CLAUDE.md QA_STANDARDS.md FIX_PATTERNS.md

# 2. Check repo state
git status
git log --oneline -5

# 3. Verify env
cat .env.example
ls .env*  # should ONLY show .env.example committed

# 4. Run smoke test
npm run test:smoke
```

---

## 🔁 STANDARD WORKFLOWS

### Workflow A — Fix a bug
1. Reproduce locally first
2. Search FIX_PATTERNS.md for similar pattern (P001-P032)
3. Write Playwright OR pytest test that reproduces it
4. Apply fix
5. Run: `npm run test` + `pytest tests/pytest`
6. Update FIX_PATTERNS.md if novel
7. Commit: `fix: description [P0XX]`
8. Push → Vercel auto-deploys
9. Verify on hadithverifier.com prod

### Workflow B — Add a new language
1. Add translations to `lib/i18n/<lang>.json`
2. Add to `LanguageSwitcher.tsx` dropdown
3. Add to multilingual parity test
4. Verify Claude API returns correct script (Latin/Cyrillic/Arabic)
5. Add severity bucket consistency test for new language

### Workflow C — Update source authority tier
1. Add domain to `TRUSTED_DOMAINS` in `lib/validate.ts`
2. Update `components/SourcesTab.tsx` to display
3. Test reference resolution returns 200 OK
4. Update README source tier table

### Workflow D — CI Pipeline
- `.github/workflows/ci.yml` runs on every push:
  - TypeScript check
  - 180 Playwright tests
  - 36 pytest tests
  - axe-core accessibility scan
  - References URL validation (all must 200 OK)
- BLOCKS deploy if red.

---

## 🐛 BUG LOG (auto-updated by Claude Code)

When fixing a bug, Claude Code MUST append an entry here:

<!-- Claude Code: prepend new bug entries below this line -->

## REFERENCE: Top 5 Production Bugs

### FP-001: Supabase RLS silently blocks reads
**Symptom:** Empty arrays from queries, no errors, works in SQL editor
**Fix:** Check RLS policies — add SELECT policy for authenticated/anon roles explicitly
**Test:** `tests/playwright/admin.spec.ts` — verifies admin queue loads

### FP-002: Placeholder env survives to Vercel prod
**Symptom:** `your-api-key-here` strings reach production
**Fix:** Validate env on startup with Zod schema — throw if placeholder pattern detected

### FP-003: Double `https://` in Supabase URL
**Symptom:** `https://https://abc.supabase.co` — fetch fails silently
**Fix:** Strip prefix before concat: `url.replace(/^https?:\/\//, '')`

### FP-004: `.eq('reviewed', false)` misses NULL rows
**Symptom:** New posts (reviewed=NULL) don't appear in admin queue
**Fix:** `.or('reviewed.is.null,reviewed.eq.false')`

### FP-005: Stale Vercel build after env change
**Symptom:** New env not picked up after `vercel --prod`
**Fix:** `vercel --prod --force` to bypass build cache

### FP-006: text-gray-400 fails WCAG 2.1 AA
**Symptom:** axe-core reports contrast violations (2.53:1, need 4.5:1)
**Fix:** Use `text-gray-600` or darker for body content

---

## 🌐 KEY URLS

- Live: https://hadithverifier.com
- Repo: https://github.com/Farhod75/hadith-verifier
- CI: https://github.com/Farhod75/hadith-verifier/actions
- Source authorities: Dorar.net, Sunnah.com, HadeethEnc.com (Tier 1)

---

## 🛠️ AUTO-LOGGING PROTOCOL

When Claude Code starts work, it MUST:

1. Before any code change — append `[WIP]` entry to BUG LOG with timestamp
2. After tests pass — update to `[DONE]` with pattern ID (P0XX)
3. If novel pattern — append to `FIX_PATTERNS.md` with full template
4. At session end — append to `AGENTS.md` session log (if exists)
5. Commit message format: `<type>: <description> [P0XX]`

Types: feat, fix, docs, test, refactor, chore, ci, sec (security)

---

## 🕋 PHILOSOPHY

This is sadaqah jariyah. No ads. No tracking. No monetization.
The goal is to protect Muslims from fabricated hadiths spreading on social media.
Quality matters more than speed. Test everything. Trust nothing the AI says without validation.
