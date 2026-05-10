import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { transcript, lang } = await req.json()

  if (!transcript) {
    return NextResponse.json({ error: 'transcript required' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
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

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ intent: 'unknown', search_query: transcript })
  }
}