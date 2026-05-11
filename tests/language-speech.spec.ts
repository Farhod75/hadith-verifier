import { test, expect, request } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const TIMEOUT = 90000

// ── Test data per language ──────────────────────────────────
const LANG_TESTS = [
  {
    lang: 'en',
    name: 'English',
    script: /[a-zA-Z]/,
    sttCode: 'en-US',
    intentTranscript: 'tell me a hadith about prayer',
    expectedIntent: 'find_hadith',
    expectedTopic: 'salah',
  },
  {
    lang: 'uz',
    name: 'Uzbek',
    script: /[\u0400-\u04FF]/,  // Cyrillic
    sttCode: 'uz-UZ',
    intentTranscript: 'namoz haqida hadis ayting',
    expectedIntent: 'find_hadith',
    expectedTopic: 'salah',
  },
  {
    lang: 'ar',
    name: 'Arabic',
    script: /[\u0600-\u06FF]/,  // Arabic
    sttCode: 'ar-SA',
    intentTranscript: 'أخبرني بحديث عن الصلاة',
    expectedIntent: 'find_hadith',
    expectedTopic: 'salah',
  },
  {
    lang: 'ru',
    name: 'Russian',
    script: /[\u0400-\u04FF]/,  // Cyrillic
    sttCode: 'ru-RU',
    intentTranscript: 'расскажи мне хадис о молитве',
    expectedIntent: 'find_hadith',
    expectedTopic: 'salah',
  },
  {
    lang: 'tj',
    name: 'Tajik',
    script: /[\u0400-\u04FF]/,  // Cyrillic
    sttCode: 'fa-IR',
    intentTranscript: 'як ҳадис дар бораи намоз бигӯ',
    expectedIntent: 'find_hadith',
    expectedTopic: 'salah',
  },
]

// ── SUITE 1: Language output validation ─────────────────────
test.describe('Multi-language output validation', () => {
  test.setTimeout(TIMEOUT)

  const FABRICATED = `Prophet said whoever reads Surah Fatiha 1000 times
                      will get 1000 rewards. Share this!`

  for (const { lang, name, script } of LANG_TESTS) {
    test(`[${lang}] ${name} — all fields returned in correct language`, async () => {
      const ctx = await request.newContext()
      const res = await ctx.post(`${BASE_URL}/api/analyze`, {
        data: { postText: FABRICATED, lang },
        timeout: TIMEOUT,
      })

      expect(res.status()).toBe(200)
      const body = await res.json()

      // Required fields present
      expect(body.verdict).toBeTruthy()
      expect(body.suggested_comment).toBeTruthy()
      expect(body.analysis).toBeTruthy()

      // suggested_comment must be in correct script
      // (except EN which is Latin — already covered)
      if (lang !== 'en') {
        const hasCorrectScript = script.test(body.suggested_comment)
        expect(hasCorrectScript,
          `[${lang}] suggested_comment not in expected script: ${body.suggested_comment?.slice(0, 80)}`
        ).toBe(true)
      }

      // Severity must be valid
      expect(['CRITICAL','HIGH','MEDIUM','LOW']).toContain(body.severity)
    })
  }
})

// ── SUITE 2: Voice intent classification ───────────────────
test.describe('Voice intent API — /api/voice-intent', () => {
  test.setTimeout(TIMEOUT)

  for (const { lang, name, intentTranscript, expectedIntent } of LANG_TESTS) {
    test(`[${lang}] ${name} — intent correctly classified`, async () => {
      const ctx = await request.newContext()
      const res = await ctx.post(`${BASE_URL}/api/voice-intent`, {
        data: { transcript: intentTranscript, lang },
        timeout: TIMEOUT,
      })

      expect(res.status()).toBe(200)
      const body = await res.json()

      // Intent must be a valid value
      expect([
        'find_hadith', 'verify_hadith',
        'find_dua', 'verify_dua',
        'find_quran', 'unknown'
      ]).toContain(body.intent)

      // For clear "find hadith about prayer" requests — must detect correctly
      expect(body.intent).toBe(expectedIntent)

      // Must return a search query
      expect(body.search_query).toBeTruthy()
    })
  }
})

// ── SUITE 3: TTS route validation ──────────────────────────
test.describe('TTS API — /api/tts', () => {
  test.setTimeout(30000)

  test('returns 400 when text missing', async () => {
    const ctx = await request.newContext()
    const res = await ctx.post(`${BASE_URL}/api/tts`, {
      data: { voiceId: 'test' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 when voiceId missing', async () => {
    const ctx = await request.newContext()
    const res = await ctx.post(`${BASE_URL}/api/tts`, {
      data: { text: 'test' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 503 or audio when called with valid params', async () => {
    const ctx = await request.newContext()
    const res = await ctx.post(`${BASE_URL}/api/tts`, {
      data: { text: 'Bismillah', voiceId: 'fkqevZRU7Xj52dY1CTkq' },
      timeout: 15000,
    })
    // Either audio response (200) or service unavailable (503)
    // Both are valid — 503 means key not configured in test env
    expect([200, 503]).toContain(res.status())

    if (res.status() === 200) {
      const contentType = res.headers()['content-type']
      expect(contentType).toContain('audio/mpeg')
    }
  })

  // Test each language TTS text
  const TTS_TEXTS = [
    { lang: 'en', text: 'Actions are judged by intentions' },
    { lang: 'ar', text: 'إنما الأعمال بالنيات' },
    { lang: 'uz', text: 'Amалlar niyatlar bilan baholanadi' },
    { lang: 'ru', text: 'Поистине, дела оцениваются по намерениям' },
    { lang: 'tj', text: 'Аъмол ба ният арзёбӣ мешаванд' },
  ]

  for (const { lang, text } of TTS_TEXTS) {
    test(`[${lang}] TTS request with ${lang} text returns valid response`, async () => {
      const ctx = await request.newContext()
      const res = await ctx.post(`${BASE_URL}/api/tts`, {
        data: { text, voiceId: 'fkqevZRU7Xj52dY1CTkq' },
        timeout: 15000,
      })
      expect([200, 503, 502]).toContain(res.status())
    })
  }
})

// ── SUITE 4: STT language code validation ──────────────────
test.describe('STT language code mapping', () => {
  // These are unit-style checks — validate the mapping is correct
  // Web Speech API cannot be tested in Playwright (browser API)
  // So we document the expected mapping instead

  const EXPECTED_MAP: Record<string, string> = {
    en: 'en-US',
    ar: 'ar-SA',
    uz: 'ru-RU',   // Web Speech API fallback — uz-UZ not supported
    ru: 'ru-RU',
    tj: 'ru-RU',   // Web Speech API fallback — Tajik not supported
  }

  for (const [lang, bcp47] of Object.entries(EXPECTED_MAP)) {
    test(`[${lang}] STT lang code is ${bcp47}`, async () => {
      // Validate by checking SpeechInput component source
      // This is a documentation/contract test
      const fs = await import('fs')
      const source = fs.readFileSync('components/SpeechInput.tsx', 'utf8')
      expect(source).toContain(`${lang}: '${bcp47}'`)
    })
  }
})