import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
// Inline severity calculation — no external import needed
function calculateSeverity(verdict: string, confidence: string, redFlags: string[]): string {
  if (verdict === 'fabricated' && confidence === 'high' && redFlags.length >= 2) return 'CRITICAL'
  if ((verdict === 'fabricated' || verdict === 'weak') && confidence === 'high') return 'HIGH'
  if (verdict === 'fabricated' && redFlags.some((f: string) =>
    f.toLowerCase().includes('chain') || f.toLowerCase().includes('share')
  )) return 'HIGH'
  if (verdict === 'weak' || verdict === 'unclear') return 'MEDIUM'
  return 'LOW'
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an Islamic hadith authentication expert with deep knowledge of hadith sciences. When given an image, extract ALL text visible then analyze it. When given text, analyze directly. Analyze for fabricated or weak hadiths attributed to Prophet Muhammad. Respond ONLY with valid JSON. No markdown, no backticks, no text outside JSON.`

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

    const langInstruction =
      lang === 'uz' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Uzbek language. Every single word must be in Uzbek." :
      lang === 'ar' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Arabic language." :
      lang === 'ru' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Russian language." :
      "Write the suggested_comment field in English."

    const jsonTemplate = `{"extracted_text":"if image provided paste ALL text from image here otherwise empty string","verdict":"fabricated","confidence":"high","claim_summary":"one sentence","red_flags":["flag1","flag2"],"analysis":"2-3 sentences","authentic_alternative":"what authentic sources say","references":[{"source":"Sunnah.com","description":"relevant hadith","url":"https://sunnah.com/bukhari:5013","authority":"tier1"}],"suggested_comment":"compassionate reply with greeting correction source URL dua closing"}`

    let messageContent: any[]

    if (imageBase64) {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
        { type: 'text', text: `Analyze this social media post image for fabricated hadiths. Extract ALL visible text first then analyze.\n${langInstruction}\n${postText ? `Additional context: ${postText}` : ''}\nReply with ONLY this JSON: ${jsonTemplate}\nverdict must be: fabricated, weak, authentic, unclear, or no_hadith` }
      ]
    } else {
      messageContent = [
        { type: 'text', text: `Analyze this post for fabricated hadiths:\n"""\n${postText}\n"""\n${langInstruction}\nReply with ONLY this JSON: ${jsonTemplate}\nverdict must be: fabricated, weak, authentic, unclear, or no_hadith` }
      ]
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    let result
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim())
      // Calculate severity score
      const severity = calculateSeverity(
        result.verdict,
        result.confidence,
        result.red_flags ?? []
      )
      result.severity = severity
    } catch {
      return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    }

    // Save to Supabase if configured
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (sbUrl.startsWith('https://') && sbKey.length > 20 && (result.verdict === 'fabricated' || result.verdict === 'weak')) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || sbKey
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
          red_flags: result.red_flags || [],      // ← ADD THIS LINE
          severity: result.severity || 'MEDIUM',  // ← ADD THIS LINE
          reviewed: false
        })
      } catch (e) { console.log('Supabase skipped:', e) }
    }

    // Inline alerts — no external import needed
if (result.verdict === 'fabricated' || result.verdict === 'weak') {
  const verdictEmoji = result.verdict === 'fabricated' ? '🚨' : '⚠️'
  
  // Slack
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  if (slackUrl?.startsWith('https://hooks.slack.com')) {
    fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${verdictEmoji} *${result.verdict.toUpperCase()}* hadith detected — Severity: *${result.severity}*\n*Claim:* ${result.claim_summary}`
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

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error:', error?.message)
    return NextResponse.json({ error: 'Analysis failed: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
