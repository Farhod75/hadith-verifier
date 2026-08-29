// app/api/analyze/route.ts
// Handles both:
//   - FormData: image upload (image file + optional postText + lang)
//   - JSON: text-only analysis (postText + lang)
// Added: seerah_context field in Claude prompt
// Fixed: P041 — new route was JSON-only, broke FormData image upload path
// P092: Claude call mockable via MOCK_CLAUDE=1 (see playwright.config.ts + .githooks/pre-push)

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
// Deterministic mock for pre-push/CI tests (MOCK_CLAUDE=1) — skips the real API.
// Verdict 'fabricated' so the queue-save path is exercised too.
//
// P129: the mock is LANGUAGE-AWARE. It used to be one frozen English constant,
// which meant every test asserting "the response is in the requested script"
// failed against it — 19 of them, in TestLanguageOutput and TestMultiLanguage.
// Those tests are correct; the mock simply could not satisfy them. A mock that
// returns the right SHAPE but never the right CONTENT quietly invalidates every
// assertion about content. Same per-language pattern as getRateLimitMsg below.
// P130: the Python suite (tests/python, 68 tests) now runs in the pre-push gate
// against the same mocked server this constant feeds. See .githooks/pre-push.
const MOCK_BY_LANG: Record<string, {
  claim_summary: string; analysis: string; suggested_comment: string; red_flags: string[]; seerah_context: string
}> = {
  en: {
    claim_summary:     'Mock claim summary for testing.',
    analysis:          'This hadith is fabricated and is not authentic. No reliable chain of narration exists in the classical collections.',
    suggested_comment: 'Assalamu alaikum. This narration appears to be fabricated — it is not found in any authentic collection. Please verify before sharing.',
    red_flags:         ['no_chain_of_narration', 'not_in_authentic_collections'],
    seerah_context:    'Mock seerah context.',
  },
  ru: {
    claim_summary:     'Пробное краткое изложение утверждения.',
    analysis:          'Этот хадис является выдуманным и недостоверным. В классических сборниках отсутствует надёжная цепочка передатчиков.',
    suggested_comment: 'Ассаляму алейкум. Это повествование представляется выдуманным — оно не найдено ни в одном достоверном сборнике. Пожалуйста, проверьте перед тем, как делиться.',
    red_flags:         ['нет_цепочки_передатчиков', 'отсутствует_в_достоверных_сборниках'],
    seerah_context:    'Пробный исторический контекст.',
  },
  uz: {
    claim_summary:     'Синов учун қисқача баён.',
    analysis:          'Бу ҳадис тўқилган ва ишончли эмас. Классик тўпламларда ишончли ровийлар силсиласи мавжуд эмас.',
    suggested_comment: 'Ассалому алайкум. Бу ривоят тўқилганга ўхшайди — у ҳеч бир ишончли тўпламда учрамайди. Тарқатишдан олдин текширинг.',
    red_flags:         ['ровийлар_силсиласи_йўқ', 'ишончли_тўпламларда_йўқ'],
    seerah_context:    'Синов тарихий контексти.',
  },
  tj: {
    claim_summary:     'Хулосаи мухтасари санҷишӣ.',
    analysis:          'Ин ҳадис сохта аст ва эътимодбахш нест. Дар маҷмӯаҳои классикӣ силсилаи боэътимоди ровиён вуҷуд надорад.',
    suggested_comment: 'Ассалому алайкум. Ин ривоят сохта ба назар мерасад — он дар ҳеҷ маҷмӯаи саҳеҳ ёфт намешавад. Пеш аз паҳн кардан санҷед.',
    red_flags:         ['силсилаи_ровиён_нест', 'дар_маҷмӯаҳои_саҳеҳ_нест'],
    seerah_context:    'Заминаи таърихии санҷишӣ.',
  },
  ar: {
    claim_summary:     'ملخص الادعاء للاختبار.',
    analysis:          'هذا الحديث موضوع وغير صحيح. لا يوجد إسناد معتمد في المجموعات الكلاسيكية.',
    suggested_comment: 'السلام عليكم. يبدو أن هذه الرواية موضوعة — لم يتم العثور عليها في أي مجموعة صحيحة. يرجى التحقق قبل المشاركة.',
    red_flags:         ['لا_يوجد_إسناد', 'ليس_في_المجموعات_الصحيحة'],
    seerah_context:    'السياق التاريخي للاختبار.',
  },
}

function mockAnalysis(lang: string) {
  const key = lang === 'uz_cyrillic' || lang === 'uz_latin' ? 'uz' : lang
  const m = MOCK_BY_LANG[key] ?? MOCK_BY_LANG.en
  return {
    verdict: 'fabricated',
    confidence: 'high',
    severity: 'HIGH',
    ...m,
    references: [
      { source: 'sunnah.com', url: 'https://sunnah.com/bukhari:1', authority: 'tier1' }
    ],
  }
}

// ─── Rate limiting (in-memory) ────────────────────────────────────────────────
const globalDaily = { count: 0, date: '' }
const ipHourly    = new Map<string, { count: number; hour: string }>()
const DAILY_CAP   = 500
const HOURLY_CAP  = 20

function getRateLimitMsg(lang: string): string {
  if (lang === 'ar') return 'تم تجاوز الحد اليومي. يُرجى المحاولة غداً.'
  if (lang === 'ru') return 'Суточный лимит исчерпан. Попробуйте завтра.'
  if (lang === 'uz' || lang === 'uz_cyrillic' || lang === 'uz_latin')
    return 'Kunlik limit tugadi. Ertaga urinib ko\'ring.'
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
    return 'Write ALL text fields (analysis, claim_summary, authentic_alternative, suggested_comment, seerah_context) in UZBEK CYRILLIC script (Ўзбек Кириллча). Every character must be Cyrillic. Do NOT use Latin.'
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
    const ip          = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const contentType = req.headers.get('content-type') || ''

    // ── Parse request — FormData (image upload) OR JSON (text) ───────────────
    let postText      = ''
    let lang          = 'en'
    let imageBase64   = ''
    let imageMediaType = 'image/jpeg'

    if (contentType.includes('multipart/form-data')) {
      // Image upload path — frontend sends FormData
      const formData = await req.formData()
      postText       = (formData.get('postText') as string) || ''
      lang           = (formData.get('lang')     as string) || 'en'
      const imageFile = formData.get('image') as File | null
      if (imageFile) {
        const bytes    = await imageFile.arrayBuffer()
        imageBase64    = Buffer.from(bytes).toString('base64')
        imageMediaType = imageFile.type || 'image/jpeg'
      }
    } else {
      // Text-only path — frontend sends JSON
      const body = await req.json().catch(() => ({}))
      postText   = body.postText || ''
      lang       = body.lang     || 'en'
      // Also accept pre-encoded base64 image from JSON (future use)
      if (body.imageBase64) {
        imageBase64    = body.imageBase64
        imageMediaType = body.imageMediaType || 'image/jpeg'
      }
    }

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!postText?.trim() && !imageBase64) {
      return NextResponse.json({ error: 'Post text or image required' }, { status: 400 })
    }

    // ── Rate limit (skipped under mock so test runs don't consume quota) ───────
    if (process.env.MOCK_CLAUDE !== '1') {
      const { limited, message } = checkRateLimit(ip, lang)
      if (limited) return NextResponse.json({ error: message }, { status: 429 })
    }

    // ── Build prompt ──────────────────────────────────────────────────────────
    const langInstruction = getLangInstruction(lang)
    const inputDescription = imageBase64
      ? `[Analyze the uploaded screenshot image]${postText ? ` Additional context: ${postText}` : ''}`
      : `"""${postText}"""`

    const userPrompt = `${langInstruction}

Analyze this social media post for hadith authenticity:
${inputDescription}

Respond with ONLY this JSON (no markdown, no backticks):
{
  "verdict": "fabricated | weak | authentic | unclear | no_hadith",
  "confidence": "high | medium | low",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "claim_summary": "One sentence: what hadith or claim is being made",
  "analysis": "2-3 sentences: why this verdict. Cite isnad issues, narrator problems, or authentication evidence.",
  "authentic_alternative": "If fabricated/weak: what authentic teaching actually says. If authentic: confirmation with collection reference.",
  "red_flags": [
    "Each specific red flag e.g. 'No isnad chain', 'Reward inflation pattern', 'Not in any major collection'"
  ],
  "references": [
    {
      "source": "Full collection name e.g. Sahih al-Bukhari",
      "description": "What this source says about the claim",
      "url": "Direct deep-link e.g. https://sunnah.com/bukhari:1234",
      "authority": "tier1 | tier2 | tier3"
    }
  ],
  "suggested_comment": "Compassionate non-confrontational reply. Include: (1) gentle correction, (2) authentic alternative, (3) verified source link. Written as if to a family member sharing in good faith.",
  "seerah_context": "2-3 sentence story from the Prophet's life ﷺ (from Ar-Raheeq Al-Makhtum / Seerah) giving human emotional context to why this topic matters. Same language as all other fields. Empty string if no_hadith verdict."
}

RULES:
1. URLs must be real deep-links — not homepages
2. Tier 1: sunnah.com, dorar.net, hadeethenc.com
3. Tier 2: islamqa.info, islamweb.net, yaqeeninstitute.org
4. seerah_context must be warm and story-like — not academic
5. All text fields in language: ${lang}`

    // ── Build message content ─────────────────────────────────────────────────
    const messageContent: any[] = imageBase64
      ? [
          { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
          { type: 'text', text: userPrompt }
        ]
      : [{ type: 'text', text: userPrompt }]

    // ── Call Claude (mockable for tests: MOCK_CLAUDE=1) ────────────────────────
    const response = process.env.MOCK_CLAUDE === '1'
            ? { content: [{ type: 'text', text: JSON.stringify(mockAnalysis(lang)) }] }
      : await anthropic.messages.create({
          model:      'claude-sonnet-5',
          max_tokens: 8000,
          system:     SYSTEM_PROMPT,
          messages:   [{ role: 'user', content: messageContent }]
        })

    const textBlock = response.content.find((b: any) => b.type === 'text') as any
    const raw = textBlock?.text ?? '{}'
    let result: any
    try {
      const clean = raw.replace(/```json|```/g, '').trim()
      result = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1))
    } catch {
      console.error('Parse error. Raw:', raw.slice(0, 300))
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // ── Override severity with deterministic scoring ───────────────────────────
    result.severity = getSeverity(result.verdict, result.confidence)

    // ── Save fabricated/weak to queue ─────────────────────────────────────────
    if (['fabricated', 'weak'].includes(result.verdict) && process.env.MOCK_CLAUDE !== '1') {
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
          red_flags:         result.red_flags   || [],
          references:        result.references  || [],
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
