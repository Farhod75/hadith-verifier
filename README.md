# Hadith Verifier

AI-powered tool to detect fabricated and weak hadiths spreading on social media. Supports Facebook, Instagram, WhatsApp, and Telegram posts in Uzbek, Arabic, Russian, and English.

**Live:** https://hadith-verifier-vp57.vercel.app  
**GitHub:** https://github.com/Farhod75/hadith-verifier

---

## Features

- **Multi-language** - analyzes posts in any language, generates replies in EN / UZ / AR / RU
- **3-tier source system** - Dorar.net, Sunnah.com, IslamQA, HadeethEnc, IslamWeb
- **Red flags detection** - identifies specific fabrication patterns
- **Ready-to-paste comments** - with direct links to authenticated sources
- **Admin queue** - persistent Supabase storage, human review workflow
- **Telegram bot** - users forward suspicious posts, bot replies instantly
- **Compassionate tone** - never accusatory, always respectful

**Core principle: AI flags, humans decide. No auto-delete or auto-ban.**

---

## Source authority

| Tier | Sources |
|---|---|
| 1 (Highest) | Dorar.net, Sunnah.com, HadeethEnc.com |
| 2 | IslamQA.info, IslamWeb.net, Yaqeen Institute, Islamhouse.com |
| 3 | HadithAPI.com, AboutIslam.net, AlSunnah.com |

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
- **Anthropic API key** - https://console.anthropic.com
- **Supabase** - https://supabase.com (free account)

### 3. Set up Supabase database

1. Create a free project at supabase.com
2. Go to SQL Editor -> New Query
3. Run this schema:

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

```json
{
  "postText": "string",
  "lang": "en | uz | ar | ru"
}
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
  "references": [{ "source": "string", "url": "string", "authority": "tier1|tier2|tier3" }]
}
```

### GET /api/queue

Returns all flagged posts ordered by created_at DESC, limit 50.

### PATCH /api/queue

Marks a post as reviewed. Body: `{ "id": "uuid" }`

### DELETE /api/queue

Deletes a post. Body: `{ "id": "uuid" }`

---

## Severity scoring

| Verdict | Confidence | Severity |
|---|---|---|
| fabricated | high | CRITICAL |
| fabricated | medium/low | HIGH |
| weak | high | HIGH |
| weak | medium/low | MEDIUM |
| authentic | any | LOW |
| no_hadith | any | LOW |
| unclear | any | MEDIUM |

---

## What the app can and cannot do

| Action | Possible |
|---|---|
| Analyze any post text | Yes |
| Generate correction comment | Yes |
| Post comment automatically | No - Meta API restricts this |
| Report to Facebook/Instagram | Manual only (open their report flow) |
| Delete post in your own group | Yes - via Facebook Group admin tools |
| Telegram bot auto-reply | Yes - full automation |

---

## Deploy to Vercel (web app)

```bash
vercel --prod --force
```

Or connect your GitHub repo to Vercel dashboard and add these environment variables:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_WEBHOOK_URL`
- `TELEGRAM_ALERT_BOT_TOKEN`
- `TELEGRAM_ALERT_CHAT_ID`

---

## Deploy Telegram bot to Railway (free)

1. Go to railway.app -> New Project -> Deploy from GitHub
2. Select your repo
3. Add environment variables: `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`
4. Set start command: `python telegram_bot.py`
5. Deploy

Bot runs 24/7 for free on Railway's starter plan.

---

## How to create your Telegram bot

1. Open Telegram -> search **@BotFather**
2. Send `/newbot`
3. Choose a name: `Hadith Verifier`
4. Choose a username: `hadith_verifier_bot` (must be unique)
5. Copy the token -> add to `.env.local` as `TELEGRAM_BOT_TOKEN`
6. Send `/setcommands` and paste:

```
start - Welcome message
help - How to use
lang_en - Reply in English
lang_uz - Reply in Uzbek
lang_ar - Reply in Arabic
lang_ru - Reply in Russian
```

---

## Testing

### Playwright (TypeScript)

```bash
npx playwright test
npx playwright test tests/api.spec.ts
npx playwright test tests/severity.spec.ts
npx playwright test tests/hadith-verifier.spec.ts
npx playwright test tests/accessibility.spec.ts

# Run against production
BASE_URL=https://hadith-verifier-vp57.vercel.app npx playwright test
```

### pytest (Python)

```bash
cd tests/python
pip install -r requirements.txt
pytest test_analyze_api.py -v

# Run against production (PowerShell)
$env:BASE_URL="https://hadith-verifier-vp57.vercel.app"; npx playwright test

# Run against production (bash/mac)
BASE_URL=https://hadith-verifier-vp57.vercel.app npx playwright test
```

### Test suite status

| Suite | File | Tests | Status |
|---|---|---|---|
| Playwright API | api.spec.ts | 16 | Passing |
| Playwright Severity | severity.spec.ts | 18 | Passing |
| Playwright UI | hadith-verifier.spec.ts | 80 | Passing |
| Playwright Accessibility | accessibility.spec.ts | 30 | Passing |
| Playwright Analytics | analytics.spec.ts | 8 | Passing |
| Python pytest | test_analyze_api.py | 46 | Passing |
| **Total** | | **198** | **All passing** |

---

## Tech stack

- **Next.js 14** + TypeScript + Tailwind CSS
- **Anthropic Claude** (claude-sonnet-4-20250514)
- **Supabase** (PostgreSQL for admin queue)
- **Python** + Telegram Bot API
- **Vercel** (web app hosting)
- **Railway** (Telegram bot hosting)
- **Playwright** + **pytest** (test suites)

---

## Known issues

- `text-gray-400` hint text has color contrast ratio of 2.53:1 (below 4.5:1 WCAG 2.1 AA). Fix: replace with `text-gray-700`.

---

## Author

Farhod - github.com/Farhod75  
Built as a portfolio project demonstrating Claude API integration, full-stack TypeScript, Python automation, and real-world AI application design.