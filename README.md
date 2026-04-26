# Hadith Verifier

> AI-powered tool to detect fabricated and weak hadiths spreading on social media.

[![CI/CD](https://github.com/Farhod75/hadith-verifier/actions/workflows/ci.yml/badge.svg)](https://github.com/Farhod75/hadith-verifier/actions)

**Live:** https://hadithverifier.com  
**Vercel:** https://hadith-verifier-vp57.vercel.app  
**GitHub:** https://github.com/Farhod75/hadith-verifier

Supports Facebook, Instagram, WhatsApp, and Telegram posts in **Uzbek, Arabic, Russian, English, and Tajik**.

---

## Features

- **Multi-language** — analyzes posts in any language, generates replies in EN / UZ / AR / RU / TJ
- **Screenshot analysis** — upload Facebook/Instagram screenshots for Claude Vision OCR analysis
- **Dua corrector** — checks Arabic dua text and transliteration for errors across 4 scripts
- **3-tier source system** — Dorar.net, Sunnah.com, IslamQA, HadeethEnc, IslamWeb
- **Red flags detection** — identifies specific fabrication patterns (chain messages, reward promises, etc.)
- **Ready-to-paste comments** — compassionate correction reply with direct links to authenticated sources
- **Admin queue** — persistent Supabase storage, human review workflow
- **Telegram bot** — users forward suspicious posts, bot replies instantly (full automation)
- **Security audit** — prompt injection resistance, output quality validation on every deploy
- **Auto-Fix Agent** — Python agent monitors CI failures and auto-generates fixes via Claude API

**Core principle: AI flags, humans decide. No auto-delete or auto-ban.**

---

## Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐    ┌────────────────────┐
│    USER     │    │  Next.js 14 UI   │    │   /api/analyze route    │    │  Anthropic Claude  │
│             │───▶│  hadithverifier  │───▶│  ① sanitizeInput()      │───▶│  claude-sonnet-4-6 │
│ Pastes post │    │  .com            │    │  ② langInstruction      │    │  Vision + Analysis │
│ or uploads  │    │  4 tabs:         │    │  ③ JSON extraction      │◀───│  JSON response     │
│ screenshot  │◀───│  Analyze / Dua / │◀───│  ④ validateOutput()     │    └────────────────────┘
│             │    │  Sources / Admin │    │  ⑤ calculateSeverity()  │
└─────────────┘    └──────────────────┘    └────────┬────────────────┘
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                           ┌──────────────┐ ┌───────────┐ ┌───────────────┐
                           │   Supabase   │ │   Slack   │ │   Telegram    │
                           │ flagged_posts│ │  Webhook  │ │   Bot alerts  │
                           │ admin review │ │ CRITICAL/ │ │   Railway     │
                           │ workflow     │ │ HIGH only │ │   deployment  │
                           └──────────────┘ └───────────┘ └───────────────┘
```

---

## Source authority tiers

| Tier | Sources | Why trusted |
|---|---|---|
| **1 (Highest)** | Dorar.net, Sunnah.com, HadeethEnc.com | Full 9 canonical collections, classical scholar grading |
| **2 (High)** | IslamQA.info, IslamWeb.net, Yaqeen Institute, Islamhouse.com | Peer-reviewed fatwa databases, multilingual |
| **3 (Standard)** | HadithAPI.com, AboutIslam.net, AlSunnah.com | REST APIs and Q&A portals |

---

## Severity scoring

| Verdict | Confidence | Severity | Action |
|---|---|---|---|
| fabricated | high | 🔴 CRITICAL | Save to Supabase + Slack alert |
| fabricated | medium/low | 🟠 HIGH | Save to Supabase + Slack alert |
| weak | high | 🟠 HIGH | Save to Supabase + Slack alert |
| weak | medium/low | 🟡 MEDIUM | Save to Supabase, no alert |
| unclear | any | 🟡 MEDIUM | Save to Supabase, no alert |
| authentic | any | 🟢 LOW | Not saved, no alert |
| no_hadith | any | 🟢 LOW | Not saved, no alert |

---

## Quick start (local)

### 1. Clone and install

```bash
git clone https://github.com/Farhod75/hadith-verifier
cd hadith-verifier
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Edit .env.local and add your keys
```

Get your keys from:
- **Anthropic API key** — https://console.anthropic.com (separate from claude.ai subscription)
- **Supabase** — https://supabase.com (free account)

### 3. Set up Supabase database

1. Create a free project at supabase.com
2. Go to SQL Editor → New Query
3. Run the schema from `supabase_schema.sql` in this repo, or paste:

```sql
CREATE TABLE flagged_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_text TEXT NOT NULL,
  verdict TEXT NOT NULL,
  confidence TEXT,
  severity TEXT,
  claim_summary TEXT,
  analysis TEXT,
  suggested_comment TEXT,
  lang TEXT DEFAULT 'en',
  sources JSONB,
  red_flags JSONB,
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE flagged_posts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON flagged_posts TO service_role;
GRANT ALL ON flagged_posts TO anon;
```

4. Copy your project URL and keys to `.env.local`

### 4. Run the web app

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Run the Telegram bot (optional)

```bash
pip install -r requirements.txt
# Add TELEGRAM_BOT_TOKEN to .env.local
# Create bot at @BotFather on Telegram first
python telegram_bot.py
```

---

## API

### POST /api/analyze

Accepts **JSON** (text) or **multipart/form-data** (image upload):

```json
{
  "postText": "string",
  "lang": "en | uz | ar | ru | tj"
}
```

Or with image:
```
Content-Type: multipart/form-data
image: <PNG or JPG file>
lang: en
```

Response:

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
  ],
  "extracted_text": "string (image path only)"
}
```

### GET /api/queue

Returns all flagged posts ordered by `created_at DESC`, limit 50.

### PATCH /api/queue

Marks a post as reviewed. Body: `{ "id": "uuid" }`

### DELETE /api/queue

Deletes a post. Body: `{ "id": "uuid" }`

### POST /api/dua

Checks Arabic dua for errors and returns corrections + transliterations.

---

## Security architecture

| Layer | What it does |
|---|---|
| `sanitizeInput()` | Strips HTML/script tags, detects 6 prompt injection patterns, rejects input > 5000 chars |
| `validateOutput()` | Enforces verdict/confidence/severity enums, filters URLs to trusted domains whitelist |
| JSON extraction | Uses `indexOf('{')` + `lastIndexOf('}')` — handles Cyrillic preamble and Unicode artifacts |
| Supabase RLS | Disabled — server routes use `SUPABASE_SERVICE_ROLE_KEY`, not anon key |
| Vercel env vars | `ANTHROPIC_API_KEY` stored as Vercel secret, never exposed to client |

---

## What the app can and cannot do

| Action | Possible |
|---|---|
| Analyze any post text or screenshot | ✅ Yes |
| Generate correction comment in 5 languages | ✅ Yes |
| Post comment automatically on Facebook/Instagram | ❌ No — Meta API restricts this |
| Delete post in your own Facebook group | ✅ Yes — via group admin tools manually |
| Telegram bot auto-reply | ✅ Yes — full automation |
| Report to Facebook/Instagram | ⚠️ Manual only (open their report flow) |

---

## CI/CD pipeline

GitHub Actions runs on every push to `main`. Tests run against production URL (no local build needed).

```yaml
# .github/workflows/ci.yml
timeout-minutes: 55
BASE_URL: https://hadithverifier.com
--workers=1  # prevents Claude API rate limiting
--project=chromium  # cost-efficient, Firefox/WebKit run locally
```

| Step | Spec file | What it covers |
|---|---|---|
| API tests | `tests/api.spec.ts` | Language output (UZ/AR/RU/EN/TJ), response structure, hallucination detection, image upload path |
| E2E tests | `tests/hadith-verifier.spec.ts` | Full UI flow, language switching, copy button, result rendering |
| Audit tests | `tests/audit.spec.ts` | Prompt injection resistance, output quality, Islamic greeting compliance, source integrity, content safety |
| Severity tests | `tests/severity.spec.ts` | Severity scoring matrix validation |
| Accessibility | `tests/accessibility.spec.ts` | WCAG compliance checks |

```bash
# Run full test suite locally
npx playwright test --project=chromium

# Run specific suite
npx playwright test tests/audit.spec.ts --project=chromium
npx playwright test tests/api.spec.ts --project=chromium

# Run against production
BASE_URL=https://hadithverifier.com npx playwright test --project=chromium

# Python tests
cd tests/python && pip install -r requirements.txt
pytest test_analyze_api.py -v
```

---

## Auto-Fix Agent

`agents/playwright_agent.py` monitors CI failures and automatically fixes them:

1. **Trigger** — `workflow_run` event fires when CI completes with failures
2. **Fetch** — reads GitHub Actions check-run annotations for failed tests
3. **Load** — reads `agents/knowledge/fix_patterns.md` (35 documented patterns)
4. **Ask Claude** — sends failure context to `claude-sonnet-4-6` for fix generation
5. **Apply** — commits fix to a new branch
6. **PR** — opens GitHub Pull Request automatically

> Requires: Settings → Actions → General → "Read and write permissions" + "Allow GitHub Actions to create PRs"

---

## Deploy to Vercel (web app)

Connect your GitHub repo to Vercel dashboard and add these environment variables:

```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SLACK_WEBHOOK_URL
TELEGRAM_ALERT_BOT_TOKEN
TELEGRAM_ALERT_CHAT_ID
```

Then:

```bash
vercel --prod --force
```

---

## Deploy Telegram bot to Railway (free)

1. Go to railway.app → New Project → Deploy from GitHub
2. Select your repo
3. Add environment variables: `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`
4. Set start command: `python telegram_bot.py`
5. Deploy — bot runs 24/7 on Railway's free starter plan

---

## How to create your Telegram bot

1. Open Telegram → search **@BotFather**
2. Send `/newbot` → choose name: `Hadith Verifier`
3. Copy the token → add to `.env.local` as `TELEGRAM_BOT_TOKEN`
4. Send `/setcommands` and paste:

```
start - Welcome message
help - How to use
lang_en - Reply in English
lang_uz - Reply in Uzbek
lang_ar - Reply in Arabic
lang_ru - Reply in Russian
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| AI Engine | Anthropic Claude API (`claude-sonnet-4-6`) |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel (web app) + Railway (Telegram bot) |
| Testing | Playwright (TypeScript) + pytest (Python) |
| CI/CD | GitHub Actions |
| Bot | Python + Telegram Bot API |

---

## Known issues

- `text-gray-400` hint text has color contrast ratio of 2.53:1 (below 4.5:1 WCAG 2.1 AA). Fix: replace with `text-gray-700`.
- Image upload parse error may occur on very large screenshots — mitigated by `max_tokens: 3000` on image path.

---

## Project structure

```
hadith-verifier/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # Main hadith analysis API
│   │   ├── dua/route.ts        # Dua correction API
│   │   └── queue/route.ts      # Admin queue API
│   └── page.tsx                # Main UI (4 tabs)
├── agents/
│   ├── playwright_agent.py     # Auto-Fix Agent
│   └── knowledge/
│       └── fix_patterns.md     # 35 documented fix patterns
├── tests/
│   ├── api.spec.ts             # API tests
│   ├── hadith-verifier.spec.ts # E2E UI tests
│   ├── audit.spec.ts           # Security audit tests
│   ├── severity.spec.ts        # Severity scoring tests
│   ├── accessibility.spec.ts   # Accessibility tests
│   ├── fixtures/
│   │   └── test-data.ts        # Test fixtures
│   └── python/
│       └── test_analyze_api.py # Python pytest suite
├── .github/workflows/
│   ├── ci.yml                  # Main CI/CD pipeline
│   └── auto-fix.yml            # Auto-Fix Agent trigger
├── telegram_bot.py             # Telegram bot
├── supabase_schema.sql         # Database schema
└── CLAUDE.md                   # Claude Code context
```

---

## Author

Farhod Elbekov — [github.com/Farhod75](https://github.com/Farhod75)

Built as a portfolio project demonstrating Claude API integration, full-stack TypeScript, Python automation, AI-powered QA workflows, and real-world Islamic content moderation tooling.

**Certifications:** ISTQB CT-AI (March 2026) · ISTQB CTFL v4.0 (Feb 2026) · CT-GenAI (In Progress)