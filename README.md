# 🌙 Hadith Verifier

AI-powered tool to detect fabricated and weak hadiths spreading on
social media. Supports Facebook, Instagram, WhatsApp, and Telegram posts
in Uzbek, Arabic, Russian, and English.

## Live demo
Deploy your own → see deployment section below

---

## Features

- **Multi-language** — analyzes posts in any language, generates replies in EN / UZ / AR / RU
- **3-tier source system** — Dorar.net, Sunnah.com, IslamQA, HadeethEnc, IslamWeb
- **Red flags detection** — identifies specific fabrication patterns
- **Ready-to-paste comments** — with direct links to authenticated sources
- **Admin queue** — persistent Supabase storage, human review workflow
- **Telegram bot** — users forward suspicious posts, bot replies instantly
- **Compassionate tone** — never accusatory, always respectful

---

## Source authority

| Tier | Sources |
|------|---------|
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
- **Anthropic API key** → https://console.anthropic.com
- **Supabase** → https://supabase.com (free account)

### 3. Set up Supabase database

1. Create a free project at supabase.com
2. Go to SQL Editor → New Query
3. Paste and run the contents of `supabase_schema.sql`
4. Copy your project URL and anon key to `.env.local`

### 4. Run the web app

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Run the Telegram bot (optional, separate terminal)

```bash
pip install -r requirements.txt
# Add TELEGRAM_BOT_TOKEN to .env.local
# Create bot at @BotFather on Telegram first
python telegram_bot.py
```

---

## Deploy to Vercel (web app)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/Farhod75/hadith-verifier
git push -u origin main

# 2. Go to vercel.com → Add New Project → Import from GitHub
# 3. Add environment variables in Vercel dashboard:
#    ANTHROPIC_API_KEY
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
# 4. Click Deploy → live in ~2 minutes
```

Your app will be at: `https://hadith-verifier.vercel.app`

---

## Deploy Telegram bot to Railway (free)

```bash
# 1. Go to railway.app → New Project → Deploy from GitHub
# 2. Select your repo
# 3. Add environment variables:
#    ANTHROPIC_API_KEY
#    TELEGRAM_BOT_TOKEN
# 4. Set start command: python telegram_bot.py
# 5. Deploy
```

Bot runs 24/7 for free on Railway's starter plan.

---

## How to create your Telegram bot

1. Open Telegram → search **@BotFather**
2. Send `/newbot`
3. Choose a name: `Hadith Verifier`
4. Choose a username: `hadith_verifier_bot` (must be unique)
5. Copy the token → add to `.env.local` as `TELEGRAM_BOT_TOKEN`
6. Send `/setdescription` to BotFather to add a description
7. Send `/setcommands` and paste:
```
start - Welcome message
help - How to use
lang_en - Reply in English
lang_uz - Reply in Uzbek
lang_ar - Reply in Arabic
lang_ru - Reply in Russian
```

---

## Important: what the app can and cannot do

| Action | Possible |
|--------|---------|
| Analyze any post text | Yes |
| Generate correction comment | Yes |
| Post comment automatically | No — Meta API restricts this |
| Report to Facebook/Instagram | Manual only (open their report flow) |
| Delete post in your own group | Yes — via Facebook Group admin tools |
| Telegram bot auto-reply | Yes — full automation |

**The AI flags → humans decide.** No auto-delete, no auto-ban.
This prevents false positives and maintains community trust.

---

## Tech stack

- **Next.js 14** + TypeScript + Tailwind CSS
- **Anthropic Claude** (claude-sonnet-4-20250514)
- **Supabase** (PostgreSQL for admin queue)
- **Python** + python-telegram-bot (Telegram bot)
- **Vercel** (web app hosting)
- **Railway** (Telegram bot hosting)

---

## Author

Farhod — github.com/Farhod75
Built as a portfolio project demonstrating:
Claude API integration, RAG architecture, full-stack TypeScript,
Python automation, and real-world AI application design.
