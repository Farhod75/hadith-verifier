# CLAUDE.md
# Context file for Claude Code
# Hadith Verifier App — github.com/Farhod75/hadith-verifier

## What this project does
An AI-powered Islamic hadith authentication tool that detects fabricated
or weak hadiths spreading on social media (Facebook, Instagram, WhatsApp).
Supports 6 languages: English, Uzbek Latin, Uzbek Cyrillic, Russian, Arabic, Tajik.
Generates compassionate correction comments with verified source deep-links.
Saves flagged posts to admin queue for human review.
Sends Telegram + Slack alerts for CRITICAL/HIGH severity.
Displays Seerah storytelling context (Ar-Raheeq Al-Makhtum) per analysis result.

Core principle: AI flags, humans decide. No auto-delete or auto-ban.

## Tech stack
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- AI: Anthropic Claude Sonnet (claude-sonnet-4-20250514)
- Database: Supabase PostgreSQL (shared with hadith-reels)
- Hosting: Vercel (web app)
- Bot: Telegram Bot API (Railway)
- Alerts: Slack webhook + Telegram Bot API
- Analytics: Google Analytics G-32J9GLEBKS (@next/third-parties/google in layout.tsx)
- TTS: ElevenLabs (Hijazi, Abrar Sabbah, Abu Salem) + browser fallback
- STT: Web Speech API (uz/tj fallback to ru-RU)
- Testing: Playwright (TypeScript) + pytest (Python) + axe-core (WCAG 2.1 AA)

## Project structure
```
hadith-verifier/
├── app/
│   ├── page.tsx                    — main UI (5 tabs: Analyze|Dua|Sources|Admin|Search)
│   ├── layout.tsx                  — Google Analytics injected here
│   └── api/
│       ├── analyze/route.ts        — Claude API + severity + rate limiting + seerah_context
│       ├── queue/route.ts          — Supabase CRUD (GET/PATCH/DELETE)
│       ├── search/route.ts         — hadith_library search (tag/keyword/grade/lang)
│       ├── stats/route.ts          — total/fabricated/authentic counts
│       └── tts/route.ts            — ElevenLabs TTS proxy
├── lib/
│   ├── anthropic.ts
│   └── supabase.ts
├── components/
│   └── TTSPlayer.tsx               — ElevenLabs + browser fallback TTS
├── tests/
│   ├── fixtures/
│   │   └── test-data.ts            — FABRICATED_POSTS, AUTHENTIC_POSTS, VALID_SOURCE_DOMAINS
│   ├── api.spec.ts                 — API tests
│   ├── severity_spec.ts            — severity scoring tests
│   ├── hadith-verifier.spec.ts     — UI + E2E + language tests (P037, P038 applied)
│   ├── audit_spec.ts               — language/translation audit + axe-core a11y
│   └── python/
│       ├── test_analyze_api.py     — pytest suite (46 tests)
│       ├── conftest.py
│       └── requirements.txt
├── telegram_bot.py
├── next.config.js                  — CSP: media-src blob: + ElevenLabs + microphone=(self)
├── .env.local                      — never commit
├── fix_patterns.md                 — 39 known CI fix patterns documented
└── CLAUDE.md                       — this file
```

## Environment variables
Required in .env.local AND Vercel (Production + Preview only — never Development):
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xeirfeqnbjfyszykiraa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
TELEGRAM_ALERT_BOT_TOKEN=...
TELEGRAM_ALERT_CHAT_ID=402610029
ELEVENLABS_API_KEY=...
NEXT_PUBLIC_GA_ID=G-32J9GLEBKS
```

## API response shape
POST /api/analyze returns:
```json
{
  "verdict": "fabricated|weak|authentic|unclear|no_hadith",
  "confidence": "high|medium|low",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "claim_summary": "string",
  "analysis": "string",
  "authentic_alternative": "string",
  "red_flags": ["string"],
  "references": [
    {
      "source": "string",
      "description": "string",
      "url": "https://sunnah.com/bukhari:1234",
      "authority": "tier1|tier2|tier3"
    }
  ],
  "suggested_comment": "string",
  "seerah_context": "string — story from Ar-Raheeq Al-Makhtum in reply language"
}
```

## Severity scoring rules (deterministic — overrides Claude output)
```
fabricated + high confidence   → CRITICAL
fabricated + medium/low        → HIGH
weak + high confidence         → HIGH
weak + medium/low              → MEDIUM
authentic                      → LOW
no_hadith                      → LOW
unclear                        → MEDIUM
```

## Rate limiting (analyze route — in-memory)
- Global daily cap: 500 requests/day
- Per-IP hourly cap: 20 requests/hour
- 429 responses are language-aware (EN/UZ/AR/RU messages)

## Supabase notes
- Shared project with hadith-reels: xeirfeqnbjfyszykiraa.supabase.co
- RLS DISABLED on flagged_posts — was silently blocking reads (P001)
- Always use SUPABASE_SERVICE_ROLE_KEY in ALL server routes
- Never use anon key server-side
- Tables: flagged_posts, hadith_library (70 seeded), hadith_reels, quran_library
- Only fabricated and weak verdicts saved to queue

## Source authority tiers
- Tier 1: sunnah.com, dorar.net, hadeethenc.com
- Tier 2: islamqa.info, islamweb.net, yaqeeninstitute.org, islamhouse.com
- Tier 3: hadithapi.com, aboutislam.net, alsunnah.com
- Seerah (storytelling only, NOT authentication): Ar-Raheeq Al-Makhtum

## Languages supported
| Code | Language | Notes |
|---|---|---|
| en | English | default |
| uz_latin | Uzbek Latin | O'zbek |
| uz_cyrillic | Uzbek Cyrillic | Ўзбек — explicit Cyrillic enforcement in prompt |
| ru | Russian | Русский |
| ar | Arabic | العربية |
| tj | Tajik | Тоҷикӣ — uses Russian as TTS fallback |

STT: Web Speech API — uz/tj fallback to ru-RU (browser limitation)
TTS: ElevenLabs voices — Hijazi (AR), Abrar Sabbah (RU), Abu Salem (AR alt)

## Run commands
```powershell
# Local dev (port 3001 — 3000 used by another app)
npm run dev -- -p 3001

# Playwright tests
npx playwright test
npx playwright test tests/api.spec.ts
npx playwright test tests/severity_spec.ts
npx playwright test tests/hadith-verifier.spec.ts
npx playwright test tests/audit_spec.ts

# Run against production
$env:BASE_URL="https://hadithverifier.com"; npx playwright test

# Python pytest
cd tests/python
pytest test_analyze_api.py -v

# Python against production
$env:BASE_URL="https://hadithverifier.com"; pytest test_analyze_api.py -v

# Deploy
vercel --prod --force

# Vercel env vars (Windows PowerShell — add Production + Preview separately)
vercel env add KEY_NAME production
vercel env add KEY_NAME preview
# Development reads from .env.local — never add via CLI
```

## Known fixes applied (full list)
1.  Supabase RLS disabled — silently blocking all flagged_posts reads
2.  ENV vars — .env.local had placeholder values, fixed via vercel pull
3.  URL double prefix — SUPABASE_URL had https:// twice
4.  queue route — removed .eq('reviewed', false) filter that hid all records
5.  Vercel deployment — vercel --prod --force after env fix
6.  Language output — langInstruction expanded to ALL output fields, not just suggested_comment
7.  Cyrillic enforcement — explicit prompt instruction for uz_cyrillic output
8.  Rate limiting — global daily + per-IP hourly caps added to analyze route
9.  Google Analytics — @next/third-parties/google in layout.tsx
10. TTS CSP — media-src blob: + ElevenLabs domain in next.config.js
11. Microphone — microphone=(self) Permissions-Policy header in next.config.js
12. Search lang mapping — uz_latin/uz_cyrillic mapping in search route
13. HadithReels banner — cross-link to hadithreels.com added after </header>
14. Hadith library seeded — 70 hadiths across 12 topics (was 10)
15. seerah_context — Ar-Raheeq Al-Makhtum storytelling field added to analyze route + UI

## Fix patterns documented (fix_patterns.md)
- P037: Hallucination URL test — locator too broad, grabbed banner link not source link
- P038: AR/UZ/RU language tests — .last() non-deterministic, use page.evaluate() with label anchor
- P039: Search tab English-only — searchHadiths() used replyLang instead of appLang

## Test suite status
- Playwright: 192 passed (CI #120 ✅) — CI #124 fix pending (P038)
- pytest: 46 passed, 0 failed ✅
- axe-core WCAG 2.1 AA: integrated in audit_spec.ts ✅
- fix_patterns.md: 39 patterns documented ✅

## CI history
- CI #120 ✅ STT lang mapping + TTS media CSP + hadith translations seeded
- CI #121 ❌ STT lang fallback + TTS CSP + microphone (fix pushed)
- CI #122 ❌ Hallucination URL test — P037 fix pushed
- CI #123 ❌ AR language test — P038 fix pushed
- CI #124 ❌ AR language test (same P038, old spec ran) — spec replacement pending push

## Live URLs
- Production: https://hadithverifier.com
- Backup: https://hadith-verifier-vp57.vercel.app
- GitHub: https://github.com/Farhod75/hadith-verifier
- Companion app: https://hadith-reels.vercel.app (shared Supabase DB)

## Pending features
- Feature 3: ShareCard (html2canvas image export) — NOT STARTED
- Feature 4: User Submission History tab — NOT STARTED
- Feature 5: PWA offline support — NOT STARTED
- Feature 6: Bookmarklet — NOT STARTED
- Feature 7: Admin Email Digest (Resend API) — NOT STARTED
- Phase 2: HadeethEnc API import script (seed 5000+ hadiths) — NOT STARTED
- Phase 3: pgvector RAG semantic search — NOT STARTED
