// app/api/voice-intent/route.ts
// Classifies a voice transcript into an app intent (find/verify hadith, dua, quran).
//
// P129: this route returned a bare 500 with Content-Length: 0 in production and
// nobody knew. Two separate faults, both fixed here:
//   1. It called model 'claude-sonnet-4-6', retired when the account moved to
//      claude-sonnet-5. Every real request failed.
//   2. The anthropic call had NO try/catch, so the exception escaped the handler
//      and Next answered with an empty 500. The route could not report its own
//      failure, which is why a live outage went unnoticed — there was nothing to
//      see. /api/analyze wraps its whole body in try/catch; this one never did.
// A route that cannot report its own failure is a route nobody will notice
// failing.

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  // P129: a malformed body threw here too, before any guard could run.
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const { transcript, lang } = body ?? {}

  if (!transcript) {
    return NextResponse.json({ error: 'transcript required' }, { status: 400 })
  }

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are an intent classifier for an Islamic app.

User said (via voice): "${transcript}"

Classify the intent and return JSON only:
{
  "intent": "find_hadith" | "verify_hadith" | "find_dua" | "verify_dua" | "find_quran" | "unknown",
  "topic": "extracted topic or tag e.g. salah, fasting, charity, patience",
  "lang": "${lang}",
  "search_query": "clean search terms for database lookup",
  "raw_text": "the actual hadith or dua text if user recited one"
}

Examples:
- "tell me a hadith about salah" → intent: find_hadith, topic: salah
- "is this hadith authentic: actions are by intentions" → intent: verify_hadith
- "recite dua before eating" → intent: find_dua, topic: eating
- [user recites Arabic dua] → intent: verify_dua, raw_text: [the text]
- "surah about patience" → intent: find_quran, topic: patience

JSON only, no preamble.`
      }]
    })
  } catch (e: any) {
    // Log the status and message so Vercel's function logs carry the cause,
    // and return it to the caller as a 503 rather than an empty 500.
    console.error('voice-intent: anthropic call failed:',
                  e?.status, e?.name, e?.message)
    return NextResponse.json(
      {
        error: 'intent classification unavailable',
        detail: e?.message ?? String(e),
        status: e?.status ?? null,
      },
      { status: 503 }
    )
  }

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    return NextResponse.json(data)
  } catch {
    // Not an error: the model returned something unparseable, and 'unknown'
    // with the raw transcript is a usable fallback for the caller.
    return NextResponse.json({ intent: 'unknown', search_query: transcript })
  }
}
