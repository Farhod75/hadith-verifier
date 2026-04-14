# CLAUDE.md
# Context file for Claude Code
# Hadith Verifier App — github.com/Farhod75/hadith-verifier

## What this project does
An AI-powered Islamic hadith authentication tool that detects fabricated
or weak hadiths spreading on social media (Facebook, Instagram, WhatsApp).
Supports Uzbek, Arabic, Russian, English. Generates compassionate correction
comments with verified source links. Saves flagged posts to admin queue for
human review. Sends Telegram + Slack alerts for CRITICAL/HIGH severity.

Core principle: AI flags, humans decide. No auto-delete or auto-ban.

## Tech stack
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- AI: Anthropic Claude Sonnet (claude-sonnet-4-20250514)
- Database: Supabase PostgreSQL (RLS DISABLED on flagged_posts)
- Hosting: Vercel (web app)
- Alerts: Slack webhook + Telegram Bot API
- Testing: Playwright (TypeScript) + pytest (Python)

## Project structure
```
hadith-verifier/
├── app/
│   ├── page.tsx                    — main UI (4 tabs)
│   ├── layout.tsx
│   └── api/
│       ├── analyze/route.ts        — Claude API + severity scoring
│       └── queue/route.ts          — Supabase CRUD (GET/PATCH/DELETE)
├── lib/
│   ├── anthropic.ts
│   └── supabase.ts
├── tests/
│   ├── fixtures/
│   │   └── test-data.ts            — test data + getSeverity helper
│   ├── api.spec.ts                 — API tests (Playwright)
│   ├── severity.spec.ts            — severity scoring tests
│   ├── hadith-verifier.spec.ts     — UI tests (Playwright)
│   └── python/
│       ├── test_analyze_api.py     — pytest suite (36 tests)
│       ├── conftest.py
│       └── requirements.txt
├── telegram_bot.py
├── .env.local                      — never commit
└── CLAUDE.md                       — this file
```

## Environment variables
Required in .env.local:
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xeirfeqnbjfyszykiraa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
TELEGRAM_ALERT_BOT_TOKEN=...
TELEGRAM_ALERT_CHAT_ID=...
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
  "suggested_comment": "string",
  "red_flags": ["string"],
  "references": [
    { "source": "string", "url": "string", "authority": "tier1|tier2|tier3" }
  ]
}
```

## Severity scoring rules
```
fabricated + high confidence   → CRITICAL
fabricated + medium confidence → HIGH
fabricated + low confidence    → HIGH
weak + high confidence         → HIGH
weak + any confidence          → MEDIUM
authentic                      → LOW
no_hadith                      → LOW
unclear                        → MEDIUM
```

## Supabase notes
- RLS is DISABLED on flagged_posts table
- Always use SUPABASE_SERVICE_ROLE_KEY in server routes
- Never use anon key for server-side DB operations
- Only fabricated and weak verdicts are saved to queue

## Source authority tiers
- Tier 1: sunnah.com, dorar.net, hadeethenc.com
- Tier 2: islamqa.info, islamweb.net, yaqeeninstitute.org, islamhouse.com
- Tier 3: hadithapi.com, aboutislam.net, alsunnah.com

## Run commands
```bash
# Local dev
npm run dev

# Playwright tests
npx playwright test
npx playwright test tests/api.spec.ts
npx playwright test tests/severity.spec.ts
npx playwright test tests/hadith-verifier.spec.ts

# Run against production
BASE_URL=https://hadith-verifier-vp57.vercel.app npx playwright test

# Python pytest
cd tests/python
pytest test_analyze_api.py -v

# Python against production
BASE_URL=https://hadith-verifier-vp57.vercel.app pytest test_analyze_api.py -v

# Deploy
vercel --prod --force
```

## Known fixes applied
1. Supabase RLS disabled — was silently blocking all reads
2. ENV vars — .env.local had placeholder values, fixed via vercel pull
3. URL double prefix — SUPABASE_URL had https:// twice, fixed
4. queue route — removed .eq('reviewed', false) filter
5. Vercel deployment — used vercel --prod --force after env fix

## Test suite status
- Playwright: 144 passed, 0 failed
- pytest: 36 passed, 0 failed
- axe-core WCAG 2.0 AA: PENDING
- README.md: PENDING

## Live URLs
- Production: https://hadith-verifier-vp57.vercel.app
- GitHub: https://github.com/Farhod75/hadith-verifier
