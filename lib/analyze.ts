// lib/analyze.ts
// P398: the analysis itself - prompt, model call, verdict, severity, queue - shared by
// /api/analyze (the site) and /api/telegram/webhook (the bot). Before, the bot was a
// separate Python program with its own prompt (P396); now both doors open on one room.
// Moved verbatim from app/api/analyze/route.ts (indentation and the prompt text
// unchanged); the route keeps request parsing and the per-IP rate limit.

import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/models'   // P388: one place for the model id
import { createClient } from '@supabase/supabase-js'
import { queueRow } from '@/lib/queue-row'

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

// ─── The analysis ─────────────────────────────────────────────────────────────
export type AnalyzeInput = { postText: string; lang: string; imageBase64?: string; imageMediaType?: string }
export type AnalyzeOutcome = { ok: true; result: any } | { ok: false; status: number; error: string }

export async function analyzePost(input: AnalyzeInput): Promise<AnalyzeOutcome> {
    const postText = input.postText || ''
    const lang = input.lang || 'en'
    const imageBase64 = input.imageBase64 || ''
    const imageMediaType = input.imageMediaType || 'image/jpeg'

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
  "seerah_context": ""
}

RULES:
1. URLs must be real deep-links — not homepages
2. Tier 1: sunnah.com, dorar.net, hadeethenc.com
3. Tier 2: islamqa.info, islamweb.net, yaqeeninstitute.org, hadithanswers.com (hadith specialists answering on specific narrations, e.g. https://hadithanswers.com/<slug>/)
4. seerah_context is always the empty string. Do not write any story, scene or
   historical narrative anywhere in the response that the cited sources do not record.
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
          model:      CLAUDE_MODEL,
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
      return { ok: false, status: 500, error: 'Failed to parse AI response' }
    }

    // ── Override severity with deterministic scoring ───────────────────────────
    result.severity = getSeverity(result.verdict, result.confidence)

    // P390: never an unsourced story, whatever the model returned
    result.seerah_context = ''

    // ── Save fabricated/weak to queue ─────────────────────────────────────────
    if (['fabricated', 'weak'].includes(result.verdict) && process.env.MOCK_CLAUDE !== '1') {
      try {
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        // P381: build the row in lib/queue-row.ts and read the error supabase-js returns -
        // it does not throw, so the catch below never saw six months of refused inserts.
        const { error: insertErr } = await sb.from('flagged_posts').insert(queueRow(postText, result, lang))
        if (insertErr) console.error('Queue save error (non-fatal):', insertErr.message)
      } catch (dbErr) {
        console.error('Queue save error (non-fatal):', dbErr)
      }
    }

    return { ok: true, result }
}
