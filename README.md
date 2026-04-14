# Hadith Verifier ☽

An AI-powered Islamic hadith authentication tool that detects fabricated or weak hadiths spreading on social media. Supports Uzbek, Arabic, Russian, and English.

**Live:** https://hadith-verifier-vp57.vercel.app  
**GitHub:** https://github.com/Farhod75/hadith-verifier

---

## What it does

- Analyzes social media posts for fabricated or weak hadiths
- Returns a verdict: `fabricated` · `weak` · `authentic` · `unclear` · `no_hadith`
- Generates compassionate correction comments in 4 languages
- Saves flagged posts to an admin queue for human review
- Sends Telegram + Slack alerts for CRITICAL/HIGH severity verdicts

**Core principle: AI flags, humans decide. No auto-delete or auto-ban.**

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| AI | Anthropic Claude Sonnet (`claude-sonnet-4-20250514`) |
| Database | Supabase PostgreSQL |
| Hosting | Vercel |
| Alerts | Slack webhook + Telegram Bot API |
| Testing | Playwright (TypeScript) + pytest (Python) |

---

## Getting started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- Anthropic API key

### Install

```bash
git clone https://github.com/Farhod75/hadith-verifier.git
cd hadith-verifier
npm install
```

### Environment variables

Create `.env.local` in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
TELEGRAM_ALERT_BOT_TOKEN=...
TELEGRAM_ALERT_CHAT_ID=...
```

Or pull from Vercel if already deployed:

```bash
vercel pull
```

### Database setup

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

### Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## API

### POST /api/analyze

Analyzes a social media post for fabricated hadiths.

**Request:**
```json
{
  "postText": "string",
  "lang": "en" | "uz" | "ar" | "ru"
}
```

**Response:**
```json
{
  "verdict": "fabricated" | "weak" | "authentic" | "unclear" | "no_hadith",
  "confidence": "high" | "medium" | "low",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "claim_summary": "string",
  "analysis": "string",
  "suggested_comment": "string",
  "red_flags": ["string"],
  "references": [
    { "source": "string", "url": "string", "authority": "tier1" | "tier2" | "tier3" }
  ]
}
```

### GET /api/queue

Returns all flagged posts ordered by `created_at` DESC, limit 50.

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

## Source authority tiers

**Tier 1 — Primary sources**
- [Dorar.net](https://dorar.net) — 520,000+ hadiths, JSON API
- [Sunnah.com](https://sunnah.com) — 9 major collections
- [HadeethEnc.com](https://hadeethenc.com) — multi-language including Uzbek

**Tier 2 — Scholarly fatwa bodies**
- [IslamQA.info](https://islamqa.info) — Sheikh Saleh Al-Munajjid
- [IslamWeb.net](https://islamweb.net) — full takhrij
- [Yaqeen Institute](https://yaqeeninstitute.org) — peer-reviewed scholarship
- [Islamhouse.com](https://islamhouse.com) — 100+ languages

**Tier 3 — Supporting sources**
- [HadithAPI.com](https://hadithapi.com)
- [AboutIslam.net](https://aboutislam.net)
- [AlSunnah.com](https://alsunnah.com)

---

## Testing

### Playwright (TypeScript)

```bash
# Run all tests locally
npx playwright test

# Run specific suite
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

# Run locally
pytest test_analyze_api.py -v

# Run against production
BASE_URL=https://hadith-verifier-vp57.vercel.app pytest test_analyze_api.py -v
```

### Test suite status

| Suite | Tests | Status |
|---|---|---|
| Playwright API | api.spec.ts | ✅ Passing |
| Playwright Severity | severity.spec.ts | ✅ Passing |
| Playwright UI | hadith-verifier.spec.ts | ✅ Passing |
| Playwright Accessibility | accessibility.spec.ts | ✅ 30 passed |
| Python pytest | test_analyze_api.py | ✅ 36 passed |
| **Total** | | **✅ 210 tests** |

---

## Deployment

```bash
# Deploy to Vercel
vercel --prod --force
```

---

## Known issues

- `text-gray-400` hint text has color contrast ratio of 2.53:1 (below 4.5:1 WCAG 2.1 AA). Tracked in accessibility suite. Fix: replace with `text-gray-700`.

---

## License

MIT