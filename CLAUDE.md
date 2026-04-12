# Hadith Verifier App — Claude Code Context

## What this project is
An AI-powered Islamic hadith authentication tool.
Detects fabricated/weak hadiths spreading on social media
(Facebook, Instagram, WhatsApp, Telegram) and generates
compassionate correction comments with verified source links.

## Tech stack
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- API: Anthropic Claude Sonnet (claude-sonnet-4-20250514)
- Database: Supabase (PostgreSQL) — admin queue persistence
- Telegram bot: Python + python-telegram-bot library
- Deploy: Vercel (web app) + Railway/Render (Telegram bot)

## Project structure
hadith-verifier/
├── app/
│   ├── page.tsx                  # Main UI — 3 tabs
│   ├── layout.tsx                # Root layout + metadata
│   ├── globals.css               # Tailwind base
│   └── api/
│       ├── analyze/route.ts      # Claude API analysis endpoint
│       └── queue/route.ts        # Supabase admin queue CRUD
├── lib/
│   ├── anthropic.ts              # Claude client + prompts
│   └── supabase.ts               # Supabase client + types
├── telegram_bot.py               # Telegram bot (Python)
├── requirements.txt              # Python dependencies
├── supabase_schema.sql           # Run in Supabase SQL editor
├── .env.example                  # Copy to .env.local
└── CLAUDE.md                     # This file

## Environment variables needed
ANTHROPIC_API_KEY=           # from console.anthropic.com
NEXT_PUBLIC_SUPABASE_URL=    # from supabase.com project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TELEGRAM_BOT_TOKEN=          # from @BotFather on Telegram

## Run locally
npm install
npm run dev
# Web app: http://localhost:3000

# Telegram bot (separate terminal):
pip install -r requirements.txt
python telegram_bot.py

## Deploy
# Web app → Vercel:
# 1. Push to github.com/Farhod75/hadith-verifier
# 2. Import repo at vercel.com
# 3. Add env variables in Vercel dashboard
# 4. Deploy — live in 2 minutes

# Telegram bot → Railway.app (free tier):
# 1. Connect GitHub repo at railway.app
# 2. Set start command: python telegram_bot.py
# 3. Add env variables
# 4. Deploy

## Key design decisions
- AI flags posts, HUMANS decide action (no auto-delete/ban)
- Source priority: Dorar.net → Sunnah.com → IslamQA → HadeethEnc
- 4 reply languages: EN, UZ, AR, RU
- Fabricated/weak posts auto-saved to Supabase queue
- Compassionate tone — never accusatory

## Common tasks for Claude Code
- "Add OCR support to read post screenshots"
- "Add Arabic RTL text direction support"
- "Add Playwright tests for the analyze API"
- "Add rate limiting to the API route"
- "Style improvements to the admin queue"
