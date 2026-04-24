import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function calculateSeverity(verdict: string, confidence: string, redFlags: string[]): string {
  if (verdict === 'fabricated' && confidence === 'high' && redFlags.length >= 2) return 'CRITICAL'
  if ((verdict === 'fabricated' || verdict === 'weak') && confidence === 'high') return 'HIGH'
  if (verdict === 'fabricated' && redFlags.some((f: string) =>
    f.toLowerCase().includes('chain') || f.toLowerCase().includes('share')
  )) return 'HIGH'
  if (verdict === 'weak' || verdict === 'unclear') return 'MEDIUM'
  return 'LOW'
}

async function sendAlerts(result: any, lang: string, postText: string) {
  const verdictEmoji = result.verdict === 'fabricated' ? '🚨' : '⚠️'

  // Slack
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  if (slackUrl?.startsWith('https://hooks.slack.com')) {
    fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `${verdictEmoji} ${result.verdict.toUpperCase()} HADITH DETECTED`, emoji: true }},
          { type: 'section', fields: [
            { type: 'mrkdwn', text: `*Verdict:* ${result.verdict}` },
            { type: 'mrkdwn', text: `*Confidence:* ${result.confidence}` },
            { type: 'mrkdwn', text: `*Severity:* ${result.severity}` },
          ]},
          { type: 'section', text: { type: 'mrkdwn', text: `*Claim:*\n${result.claim_summary}` }},
          { type: 'section', text: { type: 'mrkdwn', text: `*Red flags:*\n${(result.red_flags || []).slice(0, 3).map((f: string) => `• ${f}`).join('\n')}` }},
          { type: 'section', text: { type: 'mrkdwn', text: `*Comment (${lang.toUpperCase()}):*\n\`\`\`${result.suggested_comment?.slice(0, 300)}\`\`\`` }},
          { type: 'context', elements: [{ type: 'mrkdwn', text: '⚠️ AI flags — human admin decides action' }]}
        ]
      })
    }).catch(e => console.log('Slack error:', e))
  }

  // Telegram
  const tgToken = process.env.TELEGRAM_ALERT_BOT_TOKEN
  const tgChat = process.env.TELEGRAM_ALERT_CHAT_ID
  if (tgToken && tgChat) {
    const msg = `${verdictEmoji} *${result.verdict.toUpperCase()}* — ${result.severity}\n\n*Claim:* ${result.claim_summary}\n\n*Red flags:*\n${(result.red_flags || []).slice(0, 3).map((f: string) => `• ${f}`).join('\n')}\n\n_AI flags — human admin decides_`
    fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tgChat, text: msg, parse_mode: 'Markdown' })
    }).catch(e => console.log('Telegram error:', e))
  }
}

const SYSTEM_PROMPT = `You are an Islamic hadith authentication expert with deep knowledge of hadith sciences. When given an image, extract ALL text visible then analyze it. When given text, analyze directly. Analyze for fabricated or weak hadiths attributed to Prophet Muhammad. Respond ONLY with valid JSON. No markdown, no backticks, no text outside JSON. For suggested_comment, never include specific hadith numbers or deep links as references. Instead direct users to sunnah.com and islamqa.info as general trusted sources to verify.`
// ─── Security Layer ──────────────────────────────────────────
const TRUSTED_DOMAINS = [
  'sunnah.com', 'dorar.net', 'hadeethenc.com',
  'islamqa.info', 'islamweb.net', 'yaqeeninstitute.org', 'islamhouse.com',
]

function sanitizeInput(text: string): { safe: boolean; sanitized: string; reason?: string } {
  if (text.length > 5000) {
    return { safe: false, sanitized: '', reason: 'Input too long (max 5000 chars)' }
  }
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /override\s+verdict/i,
    /new\s+instruction[s]?:/i,
    /system\s*:/i,
    /you\s+are\s+now\s+a/i,
    /forget\s+your\s+rules/i,
  ]
  let sanitized = text
  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      console.warn(`[Security] Injection pattern detected: ${pattern}`)
      sanitized = sanitized.replace(pattern, '[removed]')
    }
  }
  sanitized = sanitized.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ')
  return { safe: true, sanitized }
}

function validateOutput(result: any): string[] {
  const errors: string[] = []
  const VALID_VERDICTS = ['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith']
  const VALID_CONFIDENCE = ['high', 'medium', 'low']
  const VALID_SEVERITY = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

  if (!VALID_VERDICTS.includes(result.verdict)) {
    errors.push(`Invalid verdict: ${result.verdict}`)
    result.verdict = 'unclear'
  }
  if (!VALID_CONFIDENCE.includes(result.confidence)) {
    errors.push(`Invalid confidence: ${result.confidence}`)
    result.confidence = 'low'
  }
  if (result.severity && !VALID_SEVERITY.includes(result.severity)) {
    errors.push(`Invalid severity: ${result.severity}`)
    result.severity = 'LOW'
  }
  if (Array.isArray(result.references)) {
    result.references = result.references.filter((ref: any) => {
      if (!ref.url?.startsWith('https://')) return false
      if (ref.url.includes('undefined') || ref.url.includes('null')) return false
      return TRUSTED_DOMAINS.some(d => ref.url.includes(d))
    })
  }
  if (!result.suggested_comment || result.suggested_comment.length < 20) {
    errors.push('suggested_comment too short')
    result.suggested_comment = 'Assalamu alaykum. Please verify this content with sunnah.com'
  }
  if (errors.length > 0) console.warn('[OutputValidation]', errors)
  return errors
}
 export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let postText = ''
    let lang = 'en'
    let imageBase64 = ''
    let imageMediaType = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      postText = formData.get('postText') as string || ''
      lang = formData.get('lang') as string || 'en'
      const imageFile = formData.get('image') as File | null
      if (imageFile) {
        const bytes = await imageFile.arrayBuffer()
        imageBase64 = Buffer.from(bytes).toString('base64')
        imageMediaType = imageFile.type || 'image/jpeg'
      }
    } else {
      const body = await req.json()
      postText = body.postText || ''
      lang = body.lang || 'en'
    }

    if (!postText?.trim() && !imageBase64) {
      return NextResponse.json({ error: 'Post text or image is required' }, { status: 400 })
    }
    // SECURITY: Sanitize input
    if (postText) {
      const { safe, sanitized, reason } = sanitizeInput(postText)
      if (!safe) return NextResponse.json({ error: reason }, { status: 400 })
      postText = sanitized
    }
    // ─── FIXED: All fields now respond in the selected language ───
    const langInstruction =
      lang === 'uz'
        ? `CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL of the following fields ENTIRELY in Uzbek language using Cyrillic script (Ўзбекча Кирилл): claim_summary, analysis, authentic_alternative, red_flags (every item), references (description field only), and suggested_comment. Do NOT use Latin Uzbek. Do NOT use English. Every single word in these fields must be in Uzbek Cyrillic. Only keep JSON field names, source names, URLs, and verdict/confidence/severity values in English.`
        : lang === 'ar'
        ? `CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL of the following fields ENTIRELY in Arabic language using Arabic script: claim_summary, analysis, authentic_alternative, red_flags (every item), references (description field only), and suggested_comment. Do NOT use English. Every single word in these fields must be in Arabic. Only keep JSON field names, source names, URLs, and verdict/confidence/severity values in English.`
        : lang === 'ru'
        ? `CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL of the following fields ENTIRELY in Russian language using Cyrillic script: claim_summary, analysis, authentic_alternative, red_flags (every item), references (description field only), and suggested_comment. Do NOT use English. Every single word in these fields must be in Russian. Only keep JSON field names, source names, URLs, and verdict/confidence/severity values in English.`
        : lang === 'tj' ? `CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL fields ENTIRELY in Tajik Cyrillic. Do NOT use Uzbek words or phrases anywhere — especially avoid Uzbek phrases like "ташриф буюринг", "марҳамат қилинг", "илтимос". Use Tajik equivalents instead: say "барои дидан гузаред" or "ба манба муроҷиат кунед" instead of "ташриф буюринг". Fields to write in Tajik: claim_summary, analysis, authentic_alternative, red_flags (every item), references (description field only), and suggested_comment. Every single sentence must be in Tajik. When referring to the Prophet write (с.а.в). Only keep JSON field names, source names, URLs, and verdict/confidence/severity values in English.` 
        : `Write ALL text fields (claim_summary, analysis, authentic_alternative, red_flags, suggested_comment) in English.`

    const jsonTemplate = `{"extracted_text":"if image provided paste ALL text from image here otherwise empty string","verdict":"fabricated","confidence":"high","claim_summary":"one sentence","red_flags":["flag1","flag2"],"analysis":"2-3 sentences","authentic_alternative":"what authentic sources say","references":[{"source":"Sunnah.com","description":"relevant hadith or ruling","url":"https://sunnah.com/bukhari:574","authority":"tier1"},{"source":"Dorar.net","description":"hadith grading and analysis","url":"https://dorar.net/hadith/sharh/12345","authority":"tier1"}],"suggested_comment":"compassionate reply with greeting correction source URL dua closing"}`

    let messageContent: any[]
    if (imageBase64) {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
        { type: 'text', text: `Analyze this social media post image for fabricated hadiths. Extract ALL visible text first then analyze.\n\n${langInstruction}\n\n${postText ? `Additional context: ${postText}` : ''}\n\nReply with ONLY this JSON: ${jsonTemplate}\nverdict must be: fabricated, weak, authentic, unclear, or no_hadith\nCRITICAL: Always include at least 2 real references with real URLs from sunnah.com, dorar.net, or islamqa.info. Never return an empty references array.` }
      ]
    } else {
      messageContent = [
        { type: 'text', text: `Analyze this post for fabricated hadiths:\n"""\n${postText}\n"""\n\n${langInstruction}\n\nReply with ONLY this JSON: ${jsonTemplate}\nverdict must be: fabricated, weak, authentic, unclear, or no_hadith\nCRITICAL: Always include at least 2 real references with real URLs from sunnah.com, dorar.net, or islamqa.info. Never return an empty references array.` }
      ]
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    let result
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim())
      // Normalize — AI occasionally returns null/object instead of array
      if (!Array.isArray(result.references)) result.references = []
      if (!Array.isArray(result.red_flags))  result.red_flags  = []
    } catch {
      return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    }

    // Calculate severity
    const severity = calculateSeverity(result.verdict, result.confidence, result.red_flags)
    result.severity = severity
    // Normalize arrays + validate output
    if (!Array.isArray(result.references)) result.references = []
    if (!Array.isArray(result.red_flags)) result.red_flags = []
    validateOutput(result)

    // Save to Supabase
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || sbKey
    if (sbUrl.startsWith('https://') && sbKey.length > 20 && (result.verdict === 'fabricated' || result.verdict === 'weak')) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(sbUrl, serviceKey)
        await sb.from('flagged_posts').insert({
          post_text: result.extracted_text || postText,
          verdict: result.verdict,
          confidence: result.confidence,
          claim_summary: result.claim_summary,
          analysis: result.analysis,
          suggested_comment: result.suggested_comment,
          lang,
          sources: result.references || [],
          red_flags: result.red_flags || [],
          severity: result.severity || 'MEDIUM',
          reviewed: false
        })
      } catch (e) { console.log('Supabase skipped:', e) }
    }

    // Send alerts
    if (result.verdict === 'fabricated' || result.verdict === 'weak') {
      await sendAlerts(result, lang, postText)
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error:', error?.message)
    return NextResponse.json({ error: 'Analysis failed: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
