# Reel link check - plan (not built)

Operator's item, 2026-11-11: "check a reel by its link". Fabricated hadiths now travel
mostly as short videos, and the competitor Daleel AI checks video links. This file is the
plan and its open decisions; nothing below is built yet.

## What a check needs

The hadith is in one of three places: the caption, the words spoken, or text burned
into the picture. A check has to reach at least the first two.

## The platforms

| Source | How to get the words | Cost | Risk |
|---|---|---|---|
| A video forwarded to the Telegram bot | Bot API `getFile` (up to 20 MB, enough for any reel) -> ffmpeg audio -> speech-to-text | STT about $0.006 per minute | none - the user sent us the file |
| TikTok link | public oEmbed `https://www.tiktok.com/oembed?url=` gives the caption, no key | free | caption only, no speech |
| YouTube Shorts link | the official API gives title and description; captions need OAuth from the owner | free | no speech without downloading |
| Instagram / Facebook reel link | no public API for someone else's reel; Meta's oEmbed needs an app token and returns little beyond the embed (to verify before relying on it) | - | downloading means a scraper (yt-dlp) that breaks often and is against the platform's terms |

## Plan

1. **Forwarded videos in the bot (phase 1).** The bot already tells the user "I can't check
   video yet" (P396). Next: download the file, extract audio with ffmpeg on Railway
   (nixpacks: add `ffmpeg`), transcribe, then send the transcript + caption to `/api/analyze`
   as text. Telegram users can forward any Telegram video; for Instagram they can use
   "Share -> Telegram -> the bot" only as a link, so phase 2 matters for them.
2. **TikTok links (phase 1, free):** oEmbed caption -> `/api/analyze`; say plainly that only the
   caption was checked.
3. **Instagram / YouTube links (phase 2, decision needed):** yt-dlp on Railway, best effort,
   with the honest fallback "send a screenshot or the text" when it fails. Legal and terms
   risk is the operator's call.
4. **The site:** a link field on the Analyze tab that calls the same worker (Vercel cannot run
   ffmpeg or long downloads; the worker lives beside the bot on Railway).

## Decisions for the operator

- Speech-to-text provider: OpenAI `whisper-1` / `gpt-4o-mini-transcribe` (about $0.003-0.006/min,
  good Arabic/Russian, Uzbek and Tajik weaker) or ElevenLabs Scribe (already paid for, strong on
  Uzbek). A 60-second reel costs well under a cent either way, plus the analysis.
- Whether to scrape Instagram/YouTube at all (phase 2).
- A daily cap for video checks (they cost more than text).

## Tests to write with it

- a transcript that quotes a fabricated hadith reaches the same verdict as the same text pasted
- a video over 20 MB gets the "too large - send a screenshot" answer, not a crash
- a link the downloader cannot open falls back to the caption, and says so
