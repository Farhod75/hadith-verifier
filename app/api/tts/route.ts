// app/api/tts/route.ts
// P061: Route previously required voiceId in body — TTSPlayer sends lang only
// Fix: route maps lang → voiceId internally
// P059: Text sanitization moved here (server-side) — strips URLs bullets etc.
// Supports: en | uz | ar | ru | tj
//
// P366: this route spends ElevenLabs credit and takes requests from anyone - it
// serves the public Listen buttons, so an admin session is the wrong gate.
// What it now refuses:
//   - a cross-origin browser request (another site using our key) -> 403
//   - more than TTS_LIMIT calls per caller per window on one instance -> 429
//   - a voiceId in the body: only the five voices below can be used. The
//     legacy override let a caller name ANY voice on the account (P061 kept
//     it for compatibility; TTSPlayer has not sent it since).
// The 600-character cap after sanitising was already here and stays.

import { NextRequest, NextResponse } from 'next/server'
import { createLimiter, clientKey } from '@/lib/rate-limit'
import { bumpCounter, secondsToWindowEnd } from '@/lib/shared-limit'

export const runtime = 'nodejs'

// ── Voice map: lang → ElevenLabs voice ID ────────────────────────────────────
// Store actual voice IDs in Vercel env vars
// These defaults are ElevenLabs free voices — replace with your licensed voices
const VOICE_MAP: Record<string, string> = {
  ar: process.env.ELEVENLABS_VOICE_AR || 'pNInz6obpgDQGcFmaJgB', // Hijazi
  ru: process.env.ELEVENLABS_VOICE_RU || 'ErXwobaYiN019PkySvjV', // Abrar Sabbah
  uz: process.env.ELEVENLABS_VOICE_UZ || 'ErXwobaYiN019PkySvjV', // Abrar Sabbah (UZ)
  tj: process.env.ELEVENLABS_VOICE_TJ || 'ErXwobaYiN019PkySvjV', // Abrar Sabbah (TJ)
  en: process.env.ELEVENLABS_VOICE_EN || 'pNInz6obpgDQGcFmaJgB', // default EN
}

// ── P059: Text sanitization before TTS ───────────────────────────────────────
// Strips elements that cause TTS to read literally and sound wrong
function sanitizeForTTS(text: string): string {
  return text
    // Remove URLs completely
    .replace(/https?:\/\/[^\s,)،\]\n]+/g, '')
    // Remove bullet/diamond chars
    .replace(/[◆♦•·‣▪▸►▶]/g, '')
    // Remove hadith number refs like #1894, bukhari:8
    .replace(/#\d+/g, '')
    .replace(/\b\w+:\d+\b/g, '')
    // Remove markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove tier labels
    .replace(/\[tier\d\]/gi, '')
    // Remove parenthetical references like (Bukhari 756)
    .replace(/\([^)]*\d+[^)]*\)/g, '')
    // Normalize whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const TTS_LIMIT = 30                 // calls per caller per window (P411: across all instances)
const TTS_WINDOW_MS = 10 * 60 * 1000
const limiter = createLimiter(TTS_LIMIT, TTS_WINDOW_MS)

function crossOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false            // same-origin GET-style or a non-browser client
  try { return new URL(origin).host !== req.headers.get('host') } catch { return true }
}

export async function POST(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ error: 'cross-origin request refused' }, { status: 403 })
  }
  const who = clientKey(req.headers)
  // P411: the shared Supabase counter is the quota; the in-memory P366 limiter is the
  // fallback when the counter cannot be reached (null), so the Listen buttons keep working.
  const windowSec = TTS_WINDOW_MS / 1000
  const shared = await bumpCounter(`tts:${who}`, windowSec, TTS_LIMIT)
  const allowed = shared === null ? limiter.take(who) : shared
  if (!allowed) {
    const retry = shared === null ? limiter.retryAfter(who) : secondsToWindowEnd(windowSec)
    return NextResponse.json(
      { error: 'Too many listen requests - try again later.' },
      { status: 429, headers: { 'Retry-After': String(retry) } }
    )
  }
  try {
    const body = await req.json().catch(() => null)

    // P061: the route takes {text, lang}. P366: a voiceId in the body is ignored.
    if (!body || !body.text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      )
    }

    const rawText = body.text as string
    const lang    = (body.lang || 'en') as string

    // P366: the voice comes from the language only - never from the request.
    const voiceId = VOICE_MAP[lang] || VOICE_MAP.en

    // P059: Sanitize text server-side
    const text = sanitizeForTTS(rawText).slice(0, 600)

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Text is empty after sanitization' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TTS service not configured. Using browser fallback.' },
        { status: 503 }
      )
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key':   apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability:        0.55,
            similarity_boost: 0.80,
            style:            0.0,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('ElevenLabs error:', res.status, errBody)
      return NextResponse.json(
        { error: `ElevenLabs returned ${res.status}` },
        { status: 502 }
      )
    }

    const audioBuffer = await res.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type':   'audio/mpeg',
        'Cache-Control':  'public, max-age=86400',
        'Content-Length': String(audioBuffer.byteLength),
      },
    })

  } catch (err: any) {
    console.error('TTS route error:', err?.message)
    return NextResponse.json(
      { error: 'TTS request failed' },
      { status: 500 }
    )
  }
}
