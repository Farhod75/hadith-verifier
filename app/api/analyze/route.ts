// app/api/analyze/route.ts
// Full ready-to-paste file
// Changes from previous version:
//   + seerah_context field added to Claude JSON prompt
//   + seerah_context included in response passthrough
//   All other logic (rate limiting, severity, queue save) unchanged

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── Rate limiting (in-memory) ────────────────────────────────────────────────
const globalDaily = { count: 0, date: '' }
const ipHourly    = new Map<string, { count: number; hour: string }>()

const DAILY_CAP   = 500
const HOURLY_CAP  = 20

function getRateLimitMsg(lang: string): string {
  if (lang === 'ar') return 'تم تجاوز الحد اليومي. يُرجى المحاولة غداً.'
  if (lang === 'ru') return 'Суточный лимит исчерпан. Попробуйте завтра.'
  if (lang === 'uz') return 'Kunlik limit tugadi. Ertaga urinib ko\'ring.'
  return 'Daily limit reached. Please try again tomorrow.'
}

function checkRateLimit(ip: string, lang: string): { limited: boolean; message: string } {
  const today = new Date().toISOString().slice(0, 10)
  const hour  = new Date().toISOString().slice(0, 13)

  if (globalDaily.date !== today) { globalDaily.date = today; globalDaily.count = 0 }
  if (globalDaily.count >= DAILY_CAP) return { limited: true, message: getRateLimitMsg(lang) }
  globalDaily.count++

  const ipEntry = ipHourly.get(ip) || { count: 0, hour: '' }
  if (ipEntry.hour !== hour) { ipEntry.count = 0; ipEntry.hour = hour }
  if (ipEntry.count >= HOURLY_CAP) return { limited: true, message: getRateLimitMsg(lang) }
  ipEntry.count++
  ipHourly.set(ip, ipEntry)

  return { limited: false, message: '' }
}

// ─── Severity scoring ─────────────────────────────────────────────────────────
function getSeverity(verdict: string, confidence: string): string {
  if (verdict === 'fabricated') return confidence === 'high' ? 'CRITICAL' : 'HIGH'
  if (verdict === 'weak')       return confidence === 'high' ? 'HIGH' : 'MEDIUM'
  if (verdict === 'unclear')    return 'MEDIUM'
  return 'LOW'
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Islamic scholar and hadith authentication specialist with deep knowledge of:
- Hadith sciences (mustalah al-hadith): isnad, matn, rijal criticism
- The six major hadith collections (Kutub al-Sittah) and their gradings
- Fabricated hadith patterns: no isnad, chain ending at Companion, reward inflation
- The Seerah literature, especially Ar-Raheeq Al-Makhtum by Safiur Rahman al-Mubarakpuri
- Compassionate, non-confrontational Islamic communication

You respond ONLY with valid JSON. No markdown, no backticks, no preamble.`

// ─── Language instruction ─────────────────────────────────────────────────────
function getLangInstruction(lang: string): string {
  if (lang === 'uz' || lang === 'uz_cyrillic')
    return 'Write ALL text fields (analysis, claim_summary, authentic_alternative, suggested_comment, seerah_context) in UZBEK CYRILLIC script (Ўзбек Кириллча). Every single character of output text must be in Cyrillic. Do NOT use Latin script for Uzbek.'
  if (lang === 'uz_latin')
    return 'Write ALL text fields in Uzbek Latin script (O\'zbek lotin).'
  if (lang === 'ru')
    return 'Write ALL text fields in Russian (Русский язык).'
  if (lang === 'ar')
    return 'Write ALL text fields in Modern Standard Arabic (العربية الفصحى).'
  if (lang === 'tj')
    return 'Write ALL text fields in Tajik Cyrillic (Тоҷикӣ).'
  return 'Write ALL text fields in English.'
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ip   = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const body = await req.json().catch(() => ({}))
    const { postText, lang = 'en', imageBase64, imageMediaType } = body

    if (!postText?.trim() && !imageBase64) {
      return NextResponse.json({ error: 'Post text or image required' }, { status: 400 })
    }

    const { limited, message } = checkRateLimit(ip, lang)
    if (limited) return NextResponse.json({ error: message }, { status: 429 })

    const langInstruction = getLangInstruction(lang)

    // ── Build prompt ──────────────────────────────────────────────────────────
    const userPrompt = `
${langInstruction}

Analyze this social media post for hadith authenticity:
"""
${postText || '[Analyze the uploaded image]'}
"""

Respond with ONLY this JSON structure (no markdown, no backticks):
{
  "verdict": "fabricated | weak | authentic | unclear | no_hadith",
  "confidence": "high | medium | low",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "claim_summary": "One sentence describing what hadith/claim is being made",
  "analysis": "2-3 sentences explaining why this verdict. Cite specific isnad issues, narrator problems, or authentication evidence.",
  "authentic_alternative": "If fabricated/weak: what the authentic teaching actually says. If authentic: confirmation with collection reference.",
  "red_flags": [
    "List each specific red flag found (e.g. 'No isnad chain', 'Reward inflation pattern', 'Not found in any major collection')"
  ],
  "references": [
    {
      "source": "Full collection name e.g. Sahih al-Bukhari",
      "description": "Brief note on what this source says about the claim",
      "url": "Direct deep-link e.g. https://sunnah.com/bukhari:1234 or https://dorar.net/hadith/... or https://islamqa.info/en/answers/...",
      "authority": "tier1 | tier2 | tier3"
    }
  ],
  "suggested_comment": "A compassionate, non-confrontational reply in the language specified above. Include: (1) gentle correction, (2) authentic alternative if applicable, (3) verified source link. Written as if responding to a family member sharing the post in good faith.",
  "seerah_context": "A 2-3 sentence story from the life of the Prophet ﷺ (from Ar-Raheeq Al-Makhtum / Seerah sources) that gives human emotional context to why this hadith topic matters — or why protecting authentic knowledge is important. Write in the same language as all other fields. For 'no_hadith' verdict, return empty string."
}

CRITICAL RULES:
1. URLs must be real deep-links to specific hadiths — not just homepages
2. Tier 1 sources: sunnah.com, dorar.net, hadeethenc.com
3. Tier 2 sources: islamqa.info, islamweb.net, yaqeeninstitute.org
4. seerah_context must be warm, human, and story-like — not academic
5. If verdict is 'no_hadith', still provide seerah_context about honesty in Islamic tradition
6. All text fields must be in the requested language: ${lang}
`

    // ── Build message content (text or image) ─────────────────────────────────
    const messageContent: any[] = imageBase64
      ? [
          { type: 'image', source: { type: 'base64', media_type: imageMediaType || 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: userPrompt }
        ]
      : [{ type: 'text', text: userPrompt }]

    // ── Call Claude ───────────────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: messageContent }]
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let result: any
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      console.error('Parse error. Raw response:', raw.slice(0, 500))
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // ── Override severity with deterministic scoring ───────────────────────────
    result.severity = getSeverity(result.verdict, result.confidence)

    // ── Save to queue if fabricated or weak ───────────────────────────────────
    if (['fabricated', 'weak'].includes(result.verdict)) {
      try {
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        await sb.from('flagged_posts').insert({
          post_text:         postText || '[image submission]',
          verdict:           result.verdict,
          confidence:        result.confidence,
          severity:          result.severity,
          claim_summary:     result.claim_summary,
          suggested_comment: result.suggested_comment,
          lang,
          red_flags:         result.red_flags || [],
          references:        result.references || [],
          created_at:        new Date().toISOString()
        })
      } catch (dbErr) {
        console.error('Queue save error (non-fatal):', dbErr)
      }
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Analyze route error:', error?.message)
    return NextResponse.json(
      { error: 'Analysis failed: ' + (error?.message || 'unknown') },
      { status: 500 }
    )
  }
}
