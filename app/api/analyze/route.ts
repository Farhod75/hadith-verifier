// app/api/analyze/route.ts
// Handles both:
//   - FormData: image upload (image file + optional postText + lang)
//   - JSON: text-only analysis (postText + lang)
// P390: seerah_context is no longer generated - always ''. It asked the model for a
//   "story from the Prophet's life (from Ar-Raheeq Al-Makhtum)", a book it was never
//   given, and the page stamped "Ar-Raheeq Al-Makhtum" on every result. Kept in the
//   response shape so older clients do not break.
// Fixed: P041 — new route was JSON-only, broke FormData image upload path
// P092: Claude call mockable via MOCK_CLAUDE=1 (see playwright.config.ts + .githooks/pre-push)

import { NextRequest, NextResponse } from 'next/server'
import { analyzePost } from '@/lib/analyze'   // P398: shared with the Telegram webhook
import { createRateLimiter, isBotRequest, BOT_CALLER } from '@/lib/analyze-limit'

// ─── Rate limiting (in-memory) - lib/analyze-limit.ts (P396) ─────────────────────
const checkRateLimit = createRateLimiter()

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
      // P396: the Telegram bot is one caller with its own cap, not one IP among many
      const fromBot = isBotRequest(req.headers.get('x-hv-bot-key'), process.env.HV_BOT_KEY)
      const { limited, message } = checkRateLimit(fromBot ? BOT_CALLER : ip, lang)
      if (limited) return NextResponse.json({ error: message }, { status: 429 })
    }

    // ── The analysis - lib/analyze.ts (P398) ───────────────────────────────────
    const outcome = await analyzePost({ postText, lang, imageBase64, imageMediaType })
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status })
    return NextResponse.json(outcome.result)

  } catch (error: any) {
    console.error('Analyze route error:', error?.message)
    return NextResponse.json(
      { error: 'Analysis failed: ' + (error?.message || 'unknown') },
      { status: 500 }
    )
  }
}
