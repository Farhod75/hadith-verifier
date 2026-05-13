# CLAUDE.md
# Hadith Verifier — Context file for Claude Code
# github.com/Farhod75/hadith-verifier
# Last updated: May 2026 — CI #144 ✅
# Read AGENTS.md and QA_STANDARDS_AGENT_RULES.md before every task
# ============================================================

## What this project does
AI-powered Islamic hadith authentication. Detects fabricated/weak hadiths
on social media. Generates compassionate correction comments with verified
source deep-links. 6 languages: EN, UZ Latin, UZ Cyrillic, AR, RU, TJ.
Seerah storytelling context (Ar-Raheeq Al-Makhtum) per analysis.
Admin queue for human review. Telegram + Slack alerts for CRITICAL/HIGH.

Core principle: AI flags → humans decide. No auto-delete, no auto-ban.

## Tech stack
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- AI: Claude Sonnet (claude-sonnet-4-20250514)
- DB: Supabase (shared with hadith-reels)
- Hosting: Vercel
- Alerts: Slack webhook + Telegram (Railway)
- TTS: ElevenLabs + browser SpeechSynthesis fallback
- Testing: Playwright + pytest + axe-core (WCAG 2.1 AA)
- Analytics: Google Analytics G-32J9GLEBKS

## Project structure
```
hadith-verifier/
├── app/
│   ├── page.tsx                   — 5 tabs: Analyze|Dua|Sources|Admin|Search
│   ├── layout.tsx
│   └── api/
│       ├── analyze/route.ts       — Claude + severity + seerah_context
│       ├── queue/route.ts         — Supabase CRUD
│       ├── search/route.ts        — hadith_library queries
│       ├── stats/route.ts
│       └── tts/route.ts           — ElevenLabs proxy
├── components/
│   ├── TTSPlayer.tsx              — P058/P059: BCP-47 codes + text sanitization
│   └── SpeechInput.tsx
├── lib/i18n.ts                    — 6 language UI translations
├── tests/
│   ├── fixtures/test-data.ts      — FABRICATED_POSTS, getSeverity()
│   ├── hadith-verifier.spec.ts    — P043: ALL MOCKED CI tests
│   ├── api.spec.ts                — P044: severity unit tests
│   ├── audit_spec.ts              — post-deploy only (P045: NOT in CI)
│   └── python/test_analyze_api.py — 46 pytest tests
├── .github/workflows/ci.yml       — push: mocked only | dispatch: audit
├── .githooks/pre-push             — P059: local tests before every push
├── .git/hooks/pre-push            — active hook (copy of .githooks)
├── AGENTS.md                      — agent orchestration rulebook
├── QA_STANDARDS_AGENT_RULES.md    — universal QA standards
├── CI_WORKFLOW_TEMPLATE.md        — CI yml template for all projects
└── fix_patterns.md                — P037–P059 documented
```

## API response shape (current)
```json
{
  "verdict":              "fabricated|weak|authentic|unclear|no_hadith",
  "confidence":           "high|medium|low",
  "severity":             "CRITICAL|HIGH|MEDIUM|LOW",
  "claim_summary":        "string",
  "analysis":             "string",
  "authentic_alternative":"string",
  "red_flags":            ["string"],
  "references":           [{"source","description","url","authority":"tier1|2|3"}],
  "suggested_comment":    "string",
  "seerah_context":       "string — Ar-Raheeq Al-Makhtum story"
}
```
Shape change → update: interface + CLAUDE.md + audit_spec.ts + MOCK_RESPONSE

## Severity (deterministic — test as unit tests P044)
```
fabricated + high → CRITICAL  |  fabricated + med/lo → HIGH
weak + high → HIGH            |  weak + med/lo → MEDIUM
authentic/no_hadith → LOW     |  unclear → MEDIUM
```

## Languages
| Code | Label | TTS BCP-47 | Notes |
|---|---|---|---|
| en | English | en-US | default |
| uz_latin | Uzbek Latin | uz-UZ | — |
| uz_cyrillic | Ўзбек | uz-UZ | explicit Cyrillic in prompt |
| ru | Русский | ru-RU | — |
| ar | العربية | ar-SA | — |
| tj | Тоҷикӣ | ru-RU | Tajik Cyrillic via Claude |

- Search: uses appLang (P039)
- Reply: replyLang auto-syncs to appLang via useEffect (P042)
- TTS: sanitizeForTTS() strips URLs/bullets before playback (P059)

## Supabase
- Shared with hadith-reels: xeirfeqnbjfyszykiraa.supabase.co
- RLS DISABLED on flagged_posts (P001 — silently blocks reads)
- ALWAYS use SUPABASE_SERVICE_ROLE_KEY server-side
- Tables: flagged_posts, hadith_library (70), hadith_reels, quran_library

## Source authority tiers
- Tier 1: sunnah.com, dorar.net, hadeethenc.com
- Tier 2: islamqa.info, islamweb.net, yaqeeninstitute.org, islamhouse.com
- Tier 3: hadithapi.com, aboutislam.net, alsunnah.com
- Seerah (storytelling only): Ar-Raheeq Al-Makhtum

## Run commands (Windows PowerShell)
```powershell
npm run dev -- -p 3001

# Pre-push test sequence (mandatory):
npx tsc --noEmit
npx playwright test tests/hadith-verifier.spec.ts --project=chromium
npx playwright test tests/api.spec.ts --project=chromium

# Post-deploy audit (manual only):
$env:BASE_URL="https://hadithverifier.com"
npx playwright test tests/audit_spec.ts --reporter=list

# Real API tests:
npx playwright test --grep @real-api

# Python pytest:
cd tests/python; pytest test_analyze_api.py -v

vercel --prod --force
```

## CI workflow
Push → pre-push hook runs tests locally first → if pass → push → CI:
- ✅ TypeScript check (continue-on-error)
- ✅ api.spec.ts (severity unit tests, mocked where needed)
- ✅ hadith-verifier.spec.ts (ALL mocked, P043)
- ⊘ audit_spec.ts (P045 — manual dispatch only)
- ⊘ language-speech.spec.ts (P045 — manual only)

Manual: GitHub Actions → Run workflow → run_audit=true

## Test suite
- Playwright CI: ~30 tests, mocked, ~5 min
- pytest: 46 tests
- audit_spec.ts: post-deploy, 29 tests, manual only
- fix_patterns.md: P037–P059 (23 patterns this session alone)

## CI history (this session)
- #122–131 ❌ P037–P043 chain (selector/timeout/mock issues)
- #132 ❌ P043 fix not pushed
- #133 ❌ P044 severity called real Claude
- #134 ❌ P044/P045 audit in CI
- #135–136 ❌ P045 audit 18 failures + wrong filename
- #137 ❌ package-lock out of sync
- #138–140 ❌ P052–P055 Remotion TypeScript/config
- #141 ❌ P058 backslash syntax error in page.tsx
- #142 ❌ P058 Vercel build syntax error (same)
- #143 ✅ P058+P059 fixed
- #144 ✅ pre-push hooks installed — first enforced push

## Fix patterns applied (P037–P059)
P037 URL locator scope · P038 AR comment .last() · P039 search appLang
P040 timeout seerah_context · P041 FormData dropped · P042 replyLang sync
P043 mock CI tests · P044 severity unit test · P045 audit from CI
P046-P048 HR CI fixes · P049 dual seerah sources · P050 TJ fallback
P051 Remotion CLI · P052 .tsx extension · P053 component cast
P054 native binaries · P055 serverExternalPackages · P056 registerRoot()
P057 WCAG AA large fonts · P058 TJ+BCP-47 · P059 TTS text sanitization
Pre-push protocol: local tests mandatory before every git push

## Pending features
- Feature 3: ShareCard — NOT STARTED
- Feature 4: User History — NOT STARTED
- Feature 5: PWA — NOT STARTED
- Feature 6: Bookmarklet — NOT STARTED
- Feature 7: Email Digest (Resend API) — NOT STARTED
- Phase 2: HadeethEnc import (5000+ hadiths) — NOT STARTED
- Phase 3: pgvector RAG — NOT STARTED

## Live URLs
- https://hadithverifier.com (production)
- https://hadith-verifier-vp57.vercel.app (backup)
- https://github.com/Farhod75/hadith-verifier
- https://hadith-reels.vercel.app (companion)
