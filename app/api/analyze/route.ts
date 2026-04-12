import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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
    } catch {
      return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    }

    // Save to Supabase if configured
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (sbUrl.startsWith('https://') && sbKey.length > 20 && (result.verdict === 'fabricated' || result.verdict === 'weak')) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(sbUrl, sbKey)
        await sb.from('flagged_posts').insert({
          post_text: result.extracted_text || postText,
          verdict: result.verdict,
          confidence: result.confidence,
          claim_summary: result.claim_summary,
          analysis: result.analysis,
          suggested_comment: result.suggested_comment,
          lang,
          sources: result.references || [],
          reviewed: false
        })
      } catch (e) { console.log('Supabase skipped:', e) }
    }

    // Send Slack alert if configured
    if (result.verdict === 'fabricated' || result.verdict === 'weak') {
      const slackUrl = process.env.SLACK_WEBHOOK_URL
      if (slackUrl && slackUrl.startsWith('https://hooks.slack.com')) {
        const verdictEmoji = result.verdict === 'fabricated' ? '🚨' : '⚠️'
        const slackBody = {
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: `${verdictEmoji} ${result.verdict.toUpperCase()} HADITH DETECTED`, emoji: true } },
            { type: 'section', fields: [
              { type: 'mrkdwn', text: `*Verdict:* ${result.verdict}` },
              { type: 'mrkdwn', text: `*Confidence:* ${result.confidence}` }
            ]},
            { type: 'section', text: { type: 'mrkdwn', text: `*Claim:*\n${result.claim_summary}` } },
            { type: 'section', text: { type: 'mrkdwn', text: `*Red flags:*\n${(result.red_flags || []).slice(0, 3).map((f: string) => `• ${f}`).join('\n')}` } },
            { type: 'section', text: { type: 'mrkdwn', text: `*Ready-to-post comment (${lang.toUpperCase()}):*\n\`\`\`${result.suggested_comment?.slice(0, 300)}\`\`\`` } },
            { type: 'context', elements: [{ type: 'mrkdwn', text: '⚠️ AI flags — human admin decides action' }] }
          ]
        }
        fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackBody)
        }).then(r => console.log('Slack alert sent:', r.status))
          .catch(e => console.log('Slack error:', e))
      }
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error:', error?.message)
    return NextResponse.json({ error: 'Analysis failed: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
