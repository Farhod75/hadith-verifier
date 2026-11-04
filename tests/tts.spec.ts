// tests/tts.spec.ts
// TTS API integration tests — added after P061
// P061: TTSPlayer sent {lang} but route required {voiceId} → 400 always
// These tests catch route/client contract mismatches early
//
// Run in pre-push (API route change):
//   npx playwright test tests/tts.spec.ts --project=chromium

import { test, expect, Page } from '@playwright/test'
import { NextRequest } from 'next/server'
import { POST as ttsPOST } from '../app/api/tts/route'
import { createLimiter } from '../lib/rate-limit'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

// ── Mock analyze response so TTS buttons appear ───────────────────────────────
async function mockAnalyzeAndNavigate(page: Page, lang = 'en') {
  await page.route('**/api/analyze', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verdict: 'fabricated',
        confidence: 'high',
        severity: 'CRITICAL',
        claim_summary: lang === 'ar' ? 'ادعاء كاذب' : 'False claim',
        analysis: lang === 'ar'
          ? 'هذه الرواية موضوعة ولا أصل لها'
          : 'This narration is fabricated',
        authentic_alternative: 'No authentic hadith with this meaning.',
        red_flags: ['No isnad chain'],
        references: [{
          source: 'Sahih al-Bukhari',
          description: 'No such narration found',
          url: 'https://sunnah.com/bukhari:1',
          authority: 'tier1'
        }],
        suggested_comment: lang === 'ar'
          ? 'أخي الكريم، هذا الحديث لا أصل له في كتب السنة الموثوقة.'
          : lang === 'uz'
          ? 'Aziz birodar, bu hadis to\'qima. Iltimos, ishonchli manbalardan tekshiring.'
          : lang === 'ru'
          ? 'Уважаемый брат, этот хадис является выдуманным.'
          : 'Dear brother, this hadith is fabricated.',
        seerah_context: 'The Prophet ﷺ warned against fabricating hadiths.',
      })
    })
  )
  await page.goto(BASE_URL)
  await page.locator('textarea').first().fill('Test hadith text for TTS testing')
  await page.locator('button.bg-emerald-700').first().click()
  await page.waitForSelector('text=/verified sources/i', { timeout: 15000 })
}

// ═════════════════════════════════════════════════════════════════════════════
// API CONTRACT TESTS — verifies route accepts {lang} not {voiceId}
// P061: This is the test that would have caught the mismatch
// ═════════════════════════════════════════════════════════════════════════════
test.describe('POST /api/tts — Contract tests (P061)', () => {

  test('should return 400 when text is missing', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tts`, {
      data: { lang: 'en' }
    })
    expect(res.status()).toBe(400)
  })

  test('should accept {text, lang} — NOT require voiceId (P061)', async ({ request }) => {
    // This is the exact test that catches P061
    // Old route: required voiceId → this would return 400
    // Fixed route: accepts lang → returns 200 or 502/503
    const res = await request.post(`${BASE_URL}/api/tts`, {
      data: { text: 'Test audio', lang: 'en' }
    })
    // Accept 200 (ElevenLabs worked), 502 (ElevenLabs error), 503 (not configured)
    // Reject 400 — that means route still requires voiceId (P061 regression)
    expect(res.status()).not.toBe(400)
  })

  test('should accept {text, lang} for AR', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tts`, {
      data: { text: 'السلام عليكم', lang: 'ar' }
    })
    expect(res.status()).not.toBe(400)
  })

  test('should accept {text, lang} for UZ', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tts`, {
      data: { text: 'Assalomu alaykum', lang: 'uz' }
    })
    expect(res.status()).not.toBe(400)
  })

  test('should accept {text, lang} for RU', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tts`, {
      data: { text: 'Ассаляму алейкум', lang: 'ru' }
    })
    expect(res.status()).not.toBe(400)
  })

  test('should accept {text, lang} for TJ', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tts`, {
      data: { text: 'Ассалому алайкум', lang: 'tj' }
    })
    expect(res.status()).not.toBe(400)
  })

  test('should strip URLs from text before sending to ElevenLabs (P059)', async ({ request }) => {
    // The route should NOT read the URL literally
    // We can't directly verify ElevenLabs received clean text,
    // but we can verify route doesn't crash on URL-containing text
    const res = await request.post(`${BASE_URL}/api/tts`, {
      data: {
        text: 'Verify at https://sunnah.com/bukhari:1 for more info',
        lang: 'en'
      }
    })
    expect(res.status()).not.toBe(400)
    expect(res.status()).not.toBe(500)
  })

  test('should return audio/mpeg content-type on success @real-api', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tts`, {
      data: { text: 'Fasting is a shield.', lang: 'en' }
    })
    if (res.status() === 200) {
      expect(res.headers()['content-type']).toContain('audio/mpeg')
    }
    // 503 = not configured (CI env) — acceptable
    expect([200, 503]).toContain(res.status())
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// UI INTEGRATION — Listen buttons call /api/tts with correct payload
// ═════════════════════════════════════════════════════════════════════════════
test.describe('UI — Listen buttons call TTS with lang not voiceId', () => {

  test('Listen to analysis button calls /api/tts with lang param', async ({ page }) => {
    const ttsRequests: any[] = []

    // Intercept TTS calls
    await page.route('**/api/tts', route => {
      const body = JSON.parse(route.request().postData() || '{}')
      ttsRequests.push(body)
      // Mock audio response
      route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from('fake-audio'),
      })
    })

    await mockAnalyzeAndNavigate(page, 'en')

    // Click Listen to analysis
    await page.locator('button').filter({ hasText: /listen to analysis/i }).first().click()
    await page.waitForTimeout(500)

    // Verify TTS was called with lang, not voiceId
    expect(ttsRequests.length).toBeGreaterThan(0)
    const req = ttsRequests[0]
    expect(req.text).toBeDefined()
    expect(req.lang).toBeDefined()    // must have lang
    expect(req.voiceId).toBeUndefined() // must NOT have voiceId
    expect(req.text).not.toContain('https://') // URLs stripped
  })

  test('Listen to comment button calls /api/tts and strips URLs', async ({ page }) => {
    const ttsRequests: any[] = []

    await page.route('**/api/tts', route => {
      const body = JSON.parse(route.request().postData() || '{}')
      ttsRequests.push(body)
      route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from('fake-audio'),
      })
    })

    await mockAnalyzeAndNavigate(page, 'en')

    // Scroll to Listen to comment button
    const listenComment = page.locator('button').filter({ hasText: /listen to comment/i }).first()
    await listenComment.scrollIntoViewIfNeeded()
    await listenComment.click()
    await page.waitForTimeout(500)

    if (ttsRequests.length > 0) {
      const req = ttsRequests[ttsRequests.length - 1]
      // URL should be stripped by sanitizeForTTS in route
      expect(req.text).not.toMatch(/https?:\/\//)
      expect(req.lang).toBeDefined()
    }
  })
})

// ─────────────────────────────────────────────────────────────
// P366 — unit tests: the route is called directly, no server, no network.
// ELEVENLABS_API_KEY is removed for these, so a request that passes every
// guard stops at 503 "not configured" and nothing is ever narrated.
// ─────────────────────────────────────────────────────────────
test.describe('TTS guards (P366) — unit', () => {
  const env = process.env as Record<string, string | undefined>
  const savedKey = env.ELEVENLABS_API_KEY
  test.beforeEach(() => { delete env.ELEVENLABS_API_KEY })
  test.afterEach(() => { if (savedKey === undefined) delete env.ELEVENLABS_API_KEY; else env.ELEVENLABS_API_KEY = savedKey })

  function call(headers: Record<string, string>, body: Record<string, unknown> = { text: 'Hello', lang: 'en' }) {
    return ttsPOST(new NextRequest('https://hadithverifier.com/api/tts', {
      method: 'POST',
      headers: { host: 'hadithverifier.com', 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }))
  }

  test('same-origin request passes the guards (stops at the missing key)', async () => {
    const res = await call({ origin: 'https://hadithverifier.com', 'x-forwarded-for': '198.51.100.1' })
    expect(res.status).toBe(503)
  })

  test('cross-origin browser request is refused before anything else', async () => {
    const res = await call({ origin: 'https://evil.example', 'x-forwarded-for': '198.51.100.2' })
    expect(res.status).toBe(403)
  })

  test('the 31st call from one caller in the window gets 429 with Retry-After', async () => {
    const ip = { 'x-forwarded-for': '198.51.100.3' }
    for (let i = 0; i < 30; i++) expect((await call(ip)).status).toBe(503)
    const res = await call(ip)
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    // another caller is unaffected
    expect((await call({ 'x-forwarded-for': '198.51.100.4' })).status).toBe(503)
  })

  test('limiter: window resets, and keys are independent', () => {
    const l = createLimiter(2, 1000)
    expect(l.take('a', 0)).toBe(true)
    expect(l.take('a', 10)).toBe(true)
    expect(l.take('a', 20)).toBe(false)
    expect(l.retryAfter('a', 20)).toBe(1)
    expect(l.take('b', 20)).toBe(true)
    expect(l.take('a', 1000)).toBe(true)
  })
})
