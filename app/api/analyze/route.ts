import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { postText, lang = 'en' } = await req.json()

    if (!postText?.trim()) {
      return NextResponse.json({ error: 'Post text is required' }, { status: 400 })
    }

    const langInstruction =
      lang === 'uz' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Uzbek language. Every single word must be in Uzbek (O'zbek tilida yozing)." :
      lang === 'ar' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Arabic language. Every single word must be in Arabic." :
      lang === 'ru' ? "IMPORTANT: Write the suggested_comment field ENTIRELY in Russian language. Every single word must be in Russian." :
      "Write the suggested_comment field in English."

    const prompt = `You are an Islamic hadith authentication expert.

Analyze this social media post for fabricated or weak hadiths:

"""
${postText}
"""

${langInstruction}

Reply with ONLY valid JSON, no markdown, no backticks:
{
  "verdict": "fabricated",
  "confidence": "high",
  "claim_summary": "one sentence describing the claim in English",
  "red_flags": ["red flag 1", "red flag 2"],
  "analysis": "2-3 sentences of scholarly analysis in English",
  "authentic_alternative": "what authentic sources say in English",
  "references": [
    {
      "source": "Sunnah.com",
      "description": "what this source says",
      "url": "https://sunnah.com/bukhari:5013",
      "authority": "tier1"
    }
  ],
  "suggested_comment": "THIS MUST BE IN THE LANGUAGE SPECIFIED ABOVE. Write a compassionate social media comment with: Islamic greeting, gentle correction without shaming, the authentic ruling, at least one direct URL from sunnah.com or islamqa.info, and a dua closing."
}

verdict must be one of: fabricated, weak, authentic, unclear, no_hadith`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    let result
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    }

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (sbUrl.startsWith('https://') && sbKey.length > 20 && (result.verdict === 'fabricated' || result.verdict === 'weak')) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(sbUrl, sbKey)
        await sb.from('flagged_posts').insert({
          post_text: postText, verdict: result.verdict, confidence: result.confidence,
          claim_summary: result.claim_summary, analysis: result.analysis,
          suggested_comment: result.suggested_comment, lang,
          sources: result.references || [], reviewed: false
        })
      } catch (e) { console.log('Supabase skipped:', e) }
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error:', error?.message)
    return NextResponse.json({ error: 'Analysis failed: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}