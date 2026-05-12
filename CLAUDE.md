# CLAUDE.md
# Context file for Claude Code
# Hadith Verifier App — github.com/Farhod75/hadith-verifier
# Last updated: May 2026 — CI #138
# Read AGENTS.md and QA_STANDARDS_AGENT_RULES.md before every task
# ============================================================

## What this project does
An AI-powered Islamic hadith authentication tool that detects fabricated
or weak hadiths spreading on social media (Facebook, Instagram, WhatsApp).
Supports 6 languages: English, Uzbek Latin, Uzbek Cyrillic, Russian, Arabic, Tajik.
Generates compassionate correction comments with verified source deep-links.
Saves flagged posts to admin queue for human review.
Sends Telegram + Slack alerts for CRITICAL/HIGH severity.
Displays Seerah storytelling context (Ar-Raheeq Al-Makhtum) per analysis.

Core principle: AI flags, humans decide. No auto-delete or auto-ban.

## Tech stack
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- AI: Anthropic Claude Sonnet (claude-sonnet-4-20250514)
- Database: Supabase PostgreSQL (shared with hadith-reels)
- Hosting: Vercel
- Bot: Telegram Bot API (Railway)
- Alerts: Slack webhook + Telegram
- Analytics: Google Analytics G-32J9GLEBKS
- TTS: ElevenLabs (Hijazi, Abrar Sabbah, Abu Salem) + browser fallback
- STT: Web Speech API (uz/tj fallback to ru-RU)
- Testing: Playwright (TypeScript) + pytest (Python) + axe-core (WCAG 2.1 AA)

## Project structure
```
hadith-verifier/
├── app/
│   ├── page.tsx                    — main UI (5 tabs: Analyze|Dua|Sources|Admin|Search)
│   ├── layout.tsx                  — Google Analytics
│   └── api/
│       ├── analyze/route.ts        — Claude API + severity + rate limiting + seerah_context
│       ├── queue/route.ts          — Supabase CRUD (GET/PATCH/DELETE)
│       ├── search/route.ts         — hadith_library search (tag/keyword/grade/appLang)
│       ├── stats/route.ts          — counts
│       └── tts/route.ts            — ElevenLabs proxy
├── components/
│   └── TTSPlayer.tsx
├── tests/
│   ├── fixtures/test-data.ts       — FABRICATED_POSTS, getSeverity(), VALID_SOURCE_DOMAINS
│   ├── api.spec.ts                 — API + severity unit tests (P044: no real Claude for severity)
│   ├── hadith-verifier.spec.ts     — UI/E2E (P043: ALL MOCKED, no real Claude)
│   ├── audit_spec.ts               — post-deploy audit (real Claude, NOT in CI — P045)
│   └── python/test_analyze_api.py  — 46 pytest tests
├── .github/workflows/ci.yml        — push: api+E2E only | manual: audit via dispatch
├── AGENTS.md                       — agent orchestration rulebook
├── QA_STANDARDS_AGENT_RULES.md     — universal QA standards (copy to all projects)
└── fix_patterns.md                 — 45 CI failure patterns
```

## API response shape (current)
```json
{
  "verdict": "fabricated|weak|authentic|unclear|no_hadith",
  "confidence": "high|medium|low",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "claim_summary": "string",
  "analysis": "string",
  "authentic_alternative": "string",
  "red_flags": ["string"],
  "references": [{"source":"","description":"","url":"","authority":"tier1|2|3"}],
  "suggested_comment": "string",
  "seerah_context": "string"
}
```
Shape change → update: AnalysisResult interface + CLAUDE.md + audit_spec.ts + MOCK_RESPONSE

## Severity (deterministic — test with unit tests only, P044)
```
fabricated + high → CRITICAL  |  fabricated + med/lo → HIGH
weak + high → HIGH            |  weak + med/lo → MEDIUM
authentic → LOW               |  no_hadith → LOW  |  unclear → MEDIUM
```

## Supabase
- Shared: xeirfeqnbjfyszykiraa.supabase.co
- RLS DISABLED on flagged_posts (P001)
- ALWAYS use SUPABASE_SERVICE_ROLE_KEY server-side
- Tables: flagged_posts, hadith_library (70 seeded), hadith_reels, quran_library

## Languages
| Code | Language | Notes |
|---|---|---|
| en | English | default |
| uz_latin | Uzbek Latin | — |
| uz_cyrillic | Uzbek Cyrillic | explicit Cyrillic in prompt |
| ru | Russian | — |
| ar | Arabic | — |
| tj | Tajik | RU TTS fallback |

- Search uses appLang NOT replyLang (P039)
- replyLang auto-syncs to appLang via useEffect (P042)

## Run commands
```powershell
npm run dev -- -p 3001

# CI push tests (mocked, fast ~5min)
npx playwright test tests/api.spec.ts --project=chromium
npx playwright test tests/hadith-verifier.spec.ts --project=chromium

# Post-deploy audit (real Claude, manual only — P045)
$env:BASE_URL="https://hadithverifier.com"
npx playwright test tests/audit_spec.ts --reporter=list

# Real-API tagged tests only
npx playwright test --grep @real-api

# pytest
cd tests/python; pytest test_analyze_api.py -v

vercel --prod --force
```

## CI workflow
Push to main:
- ✅ api.spec.ts — severity unit tests, mocked where needed
- ✅ hadith-verifier.spec.ts — ALL mocked (P043)
- ⊘ audit_spec.ts — EXCLUDED from push (P045)
- ⊘ language-speech.spec.ts — EXCLUDED from push (P045)

Manual audit: GitHub Actions → Run workflow → run_audit=true

## Test suite (May 2026)
- Playwright CI push: ~29 tests, mocked, ~5 min
- pytest: 46 tests
- audit_spec.ts: 29 tests, post-deploy manual
- fix_patterns.md: 45 patterns

## CI history
- CI #120 ✅  CI #121-136 ❌ (P037–P045 chain)
- CI #138 ⏳ P045 ci.yml fix — expected ✅

## Known bugs open
- ElevenLabs TTS on prod: CSP fix pushed, not verified
- Microphone: microphone=(self) pushed, not verified

## Pending features
- Feature 3: ShareCard — NOT STARTED
- Feature 4: User History — NOT STARTED
- Feature 5: PWA — NOT STARTED
- Feature 6: Bookmarklet — NOT STARTED
- Feature 7: Email Digest — NOT STARTED
- Phase 2: HadeethEnc import script — NOT STARTED
- Phase 3: pgvector RAG — NOT STARTED

## All fix patterns (P001–P045)
P001 Supabase RLS disabled · P018 UZ Cyrillic enforcement · P030 Arabic titles in EN analysis
P033 Ready-to-post label · P035 Image upload parse error · P036 Greeting indicators expanded
P037 URL locator too broad · P038 AR comment .last() non-deterministic
P039 Search appLang not replyLang · P040 Timeout after seerah_context
P041 FormData dropped in route rewrite · P042 replyLang not synced to appLang
P043 Language tests mock real Claude · P044 Severity unit tests not through Claude
P045 audit+language-speech removed from CI yml — manual dispatch only

## Live URLs
- https://hadithverifier.com (production)
- https://hadith-verifier-vp57.vercel.app (backup)
- https://github.com/Farhod75/hadith-verifier
- https://hadith-reels.vercel.app (companion, shared Supabase)
