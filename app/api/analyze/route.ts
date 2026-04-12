import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an Islamic hadith authentication expert with deep knowledge of hadith sciences (Mustalah al-Hadith). 

When given an image, first extract ALL text visible in the image, then analyze it.
When given text, analyze it directly.

Analyze for fabricated or weak hadiths attributed to Prophet Muhammad ﷺ.

Key fabrication red flags:
- Specific large reward numbers not in authentic collections (4000 days, 70000 angels)
- Formula: Read Surah X Y times = Z reward without isnad
- Chain message pressure like share with 10 people
- Disproportionate rewards for trivial acts
- No reference to any collection or narrator chain
- Guaranteed paradise for simple actions

Source priority: Dorar.net → Sunnah.com → IslamQA.info → HadeethEnc.com

Respond ONLY with valid JSON. No markdown, no backticks, no text outside JSON.`

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let postText = ''
    let lang = 'en'
    let imageBase64 = ''
    let imageMediaType = ''

    // Handle both JSON (text) and FormData (image upload)
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
      lang === 'uz' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Uzbek language. Every single word must be in Uzbek (O'zbek tilida yozing)." :
      lang === 'ar' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Arabic language. Every word must be in Arabic." :
      lang === 'ru' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Russian language. Every word must be in Russian." :
      "Write the suggested_comment field in English."

    const jsonTemplate = `{
  "extracted_text": "if image provided, paste ALL text you read from the image here, otherwise empty string",
  "verdict": "fabricated",
  "confidence": "high",
  "claim_summary": "one sentence describing the hadith claim in English",
  "red_flags": ["specific red flag 1", "specific red flag 2"],
  "analysis": "2-3 sentences of scholarly analysis in English",
  "authentic_alternative": "what authentic sources say on this topic",
  "references": [
    {
      "source": "Sunnah.com",
      "description": "relevant authentic hadith",
      "url": "https://sunnah.com/bukhari:5013",
      "authority": "tier1"
    }
  ],
  "suggested_comment": "THIS MUST BE IN THE LANGUAGE SPECIFIED. Compassionate social media comment with: Islamic greeting, gentle correction without shaming, authentic ruling, direct URL from sunnah.com or islamqa.info, dua closing."
}`

    // Build message content based on whether image or text was provided
    let messageContent: any[]

    if (imageBase64) {
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMediaType,
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: `Please analyze this social media post image for fabricated hadiths.

First extract ALL the text you can see in the image.
Then analyze it for fabricated or weak hadiths.

${langInstruction}

${postText ? `Additional context from user: ${postText}` : ''}

Reply with ONLY this JSON (no markdown):
${jsonTemplate}

verdict must be one of: fabricated, weak, authentic, unclear, no_hadith`
        }
      ]
    } else {
      messageContent = [
        {
          type: 'text',
          text: `Analyze this social media post for fabricated hadiths:

"""
${postText}
"""

${langInstruction}

Reply with ONLY this JSON (no markdown):
${jsonTemplate}

verdict must be one of: fabricated, weak, authentic, unclear, no_hadith`
        }
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
      console.error('Parse error, raw:', raw.substring(0, 200))
      return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    }

    // Save to Supabase if configured
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (sbUrl.startsWith('https://') && sbKey.length > 20 &&
      (result.verdict === 'fabricated' || result.verdict === 'weak')) {
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

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error:', error?.message)
    return NextResponse.json(
      { error: 'Analysis failed: ' + (error?.message || 'unknown') },
      { status: 500 }
    )
  }
}
