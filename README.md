# Hadith Verifier

AI-powered tool to detect fabricated and weak hadiths spreading on social media.
Supports Facebook, Instagram, WhatsApp, and Telegram posts in Uzbek, Arabic, Russian, and English.

**Live:** https://hadithverifier.com
**GitHub:** https://github.com/Farhod75/hadith-verifier

---

## Features

- **Multi-language** — analyzes posts in any language, generates replies in EN / UZ / AR / RU
- **3-tier source system** — Dorar.net, Sunnah.com, IslamQA, HadeethEnc, IslamWeb
- **Red flags detection** — identifies specific fabrication patterns
- **Ready-to-paste comments** — with direct links to authenticated sources
- **Admin queue** — persistent Supabase storage, human review workflow
- **Telegram bot** — users forward suspicious posts, bot replies instantly
- **Speech-to-Text** — speak hadiths directly into the analyzer (Web Speech API)
- **Text-to-Speech** — listen to analysis and comments with Arabic reciter voices (ElevenLabs)
- **Dua corrector** — verifies Arabic dua text with transliterations in UZ/RU/EN
- **Image upload** — analyze screenshots via Claude Vision
- **Compassionate tone** — never accusatory, always respectful

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

Required keys:
- `ANTHROPIC_API_KEY` — console.anthropic.com
- `NEXT_PUBLIC_SUPABASE_URL` — supabase.com
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — supabase.com
- `SUPABASE_SERVICE_ROLE_KEY` — supabase.com
- `ELEVENLABS_API_KEY` — elevenlabs.io (optional, browser TTS fallback if missing)
- `SLACK_WEBHOOK_URL` — optional
- `TELEGRAM_ALERT_BOT_TOKEN` — optional
- `TELEGRAM_ALERT_CHAT_ID` — optional

### 3. Set up Supabase database

Run in Supabase SQL Editor:

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

### 4. Run locally

```bash
npm run dev -- -p 3001
# Open http://localhost:3001
```

---

## API

### POST /api/analyze

```json
{ "postText": "string", "lang": "en | uz | ar | ru" }
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

### POST /api/tts

```json
{ "text": "string", "voiceId": "elevenlabs_voice_id" }
```
Returns: `audio/mpeg` stream

### GET /api/queue
Returns flagged posts ordered by created_at DESC, limit 50.

### PATCH /api/queue
Marks post as reviewed. Body: `{ "id": "uuid" }`

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

## Project structure
hadith-verifier/
├── app/
│   ├── page.tsx                    — main UI (4 tabs)
│   ├── layout.tsx
│   └── api/
│       ├── analyze/route.ts        — Claude API + severity scoring
│       ├── dua/route.ts            — Dua corrector
│       ├── queue/route.ts          — Supabase admin queue
│       └── tts/route.ts            — ElevenLabs TTS proxy
├── components/
│   ├── SpeechInput.tsx             — Web Speech API STT
│   └── TTSPlayer.tsx               — ElevenLabs TTS + reciter picker
├── lib/
│   └── i18n.ts                     — translations EN/UZ/AR/RU
├── agents/
│   └── playwright_agent.py         — auto-fix agent
├── tests/
│   ├── api.spec.ts
│   ├── severity.spec.ts
│   ├── hadith-verifier.spec.ts
│   ├── accessibility.spec.ts
│   └── python/
│       └── test_analyze_api.py
├── .github/workflows/
│   ├── ci.yml
│   └── auto-fix.yml
├── CHANGELOG.md
├── FEATURES.md
├── fix_patterns.md
└── CLAUDE.md

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
BASE_URL=https://hadithverifier.com npx playwright test
```

### pytest (Python)

```bash
cd tests/python
pip install -r requirements.txt
pytest test_analyze_api.py -v

# Run against production
BASE_URL=https://hadithverifier.com pytest test_analyze_api.py -v
```

### Test suite status

| Suite | File | Tests | Status |
|---|---|---|---|
| Playwright API | api.spec.ts | 16 | ✅ Passing |
| Playwright Severity | severity.spec.ts | 18 | ✅ Passing |
| Playwright UI | hadith-verifier.spec.ts | 80 | ✅ Passing |
| Playwright Accessibility | accessibility.spec.ts | 30 | ✅ Passing |
| Playwright Audit | audit.spec.ts | 48 | ✅ Passing |
| Python pytest | test_analyze_api.py | 46 | ✅ Passing |
| **Total** | | **238** | **All passing** |

---

## Tech stack

- **Next.js 14** + TypeScript + Tailwind CSS
- **Anthropic Claude** (claude-sonnet-4-6)
- **Supabase** (PostgreSQL, RLS disabled on flagged_posts)
- **ElevenLabs** (Arabic TTS — Hijazi, Abrar Sabbah, Abu Salem voices)
- **Web Speech API** (STT + TTS browser fallback)
- **Python** + Telegram Bot API
- **Vercel** (web app) + **Railway** (Telegram bot)
- **Playwright** + **pytest** (238 tests)
- **GitHub Actions** CI/CD + Auto-Fix Agent

---

## Agents

| Agent | File | Trigger | Purpose |
|---|---|---|---|
| Auto-Fix | agents/playwright_agent.py | CI test failure | Auto-PRs fixes for failing tests |
| Doc Agent | agents/doc_agent.py | Merge to main | Updates CHANGELOG + FEATURES |

---

## Known issues

- `text-gray-400` hint text has color contrast ratio 2.53:1 (below 4.5:1 WCAG 2.1 AA)
- Web Speech API not supported in Firefox (STT/TTS buttons hidden automatically)

---

## Author

Farhod Elbekov — github.com/Farhod75
ISTQB CT-AI & CTFL Certified SDET / AI QA Engineer, Charlotte NC
Built as a portfolio project demonstrating Claude API integration,
full-stack TypeScript, Python automation, and real-world AI application design.