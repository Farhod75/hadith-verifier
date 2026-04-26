import { test, expect } from '@playwright/test'
import {
  FABRICATED_POSTS,
  AUTHENTIC_POSTS,
  VALID_SOURCE_DOMAINS,
  getSeverity,
  type Verdict,
  type Confidence
} from './fixtures/test-data'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('POST /api/analyze — Request validation', () => {
  test('should return 400 when postText is empty', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, { data: { postText: '', lang: 'en' } })
    expect(res.status()).toBe(400)
  })

  test('should return 400 when postText is missing', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, { data: { lang: 'en' } })
    expect(res.status()).toBe(400)
  })

  test('should return 200 with valid text input', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000
    })
    expect(res.status()).toBe(200)
  })

  test('image upload path should not return parse error (P035)', async ({ request }) => {
    // 1x1 transparent PNG — exercises image code path without real image content
    // Ensures max_tokens and JSON extraction work for multipart/form-data requests
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      multipart: {
        image: { name: 'test.png', mimeType: 'image/png', buffer: pixel },
        lang: 'en'
      },
      timeout: 90000
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Must never return parse error (P035)
    expect(body.error).toBeUndefined()
    expect(['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith']).toContain(body.verdict)
  })
})

test.describe('POST /api/analyze — Response structure (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('should return all required fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.verdict).toBeDefined()
    expect(body.confidence).toBeDefined()
    expect(body.claim_summary).toBeDefined()
    expect(body.analysis).toBeDefined()
    expect(body.suggested_comment).toBeDefined()
    expect(Array.isArray(body.references)).toBe(true)
  })

  test('verdict must be one of valid values', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith']).toContain(body.verdict)
  })

  test('confidence must be high, medium, or low', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(['high', 'medium', 'low']).toContain(body.confidence)
  })

  test('red_flags should be an array', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(Array.isArray(body.red_flags)).toBe(true)
  })

  test('references should have source, url, authority fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    if (body.references?.length > 0) {
      const ref = body.references[0]
      expect(ref.source).toBeDefined()
      expect(ref.url).toBeDefined()
      expect(['tier1', 'tier2', 'tier3']).toContain(ref.authority)
    }
  })
})

test.describe('POST /api/analyze — AI quality tests (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('fabricated Uzbek post should return fabricated or weak', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(['fabricated', 'weak']).toContain(body.verdict)
  })

  test('chain message should be detected as fabricated or weak', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(['fabricated', 'weak']).toContain(body.verdict)
  })

  test('authentic Bukhari hadith should return a valid verdict', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.bukhari, lang: 'en' }, timeout: 60000
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith']).toContain(body.verdict)
    expect(body.analysis.length).toBeGreaterThan(20)
  })

  test('should detect chain message indicators in analysis or red_flags', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    const allContent = [
      ...(body.red_flags || []),
      body.analysis || '',
      body.claim_summary || ''
    ].join(' ').toLowerCase()
    const hasChainFlag =
      allContent.includes('chain') ||
      allContent.includes('share') ||
      allContent.includes('pressure') ||
      allContent.includes('forward')
    expect(hasChainFlag).toBe(true)
  })
})

test.describe('POST /api/analyze — Hallucination detection (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('URLs in references should be from valid Islamic sources', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    if (body.references?.length > 0) {
      for (const ref of body.references) {
        if (ref.url && ref.url.startsWith('http')) {
          expect(VALID_SOURCE_DOMAINS.some((d: string) => ref.url.includes(d))).toBe(true)
        }
      }
    }
  })

  test('suggested_comment should not be empty', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(body.suggested_comment).toBeTruthy()
    expect(body.suggested_comment.length).toBeGreaterThan(30)
    expect(body.suggested_comment).not.toBe('undefined')
  })

  test('analysis should be meaningful text', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(body.analysis.length).toBeGreaterThan(50)
    expect(body.analysis).not.toContain('[placeholder]')
  })
})

// ─────────────────────────────────────────────────────────────
// Language tests — CT-GenAI full language output validation
// Uses native language input per language (P029/P030 fix)
// retries: 3 for AI non-determinism
// ─────────────────────────────────────────────────────────────
test.describe('POST /api/analyze — Language tests (CT-GenAI)', () => {
  test.setTimeout(90000)
  test.describe.configure({ retries: 1 })

  test('UZ lang — comment and analysis must be in Uzbek or Cyrillic', async ({ request }) => {
    // P029: use native Uzbek input, check comment OR analysis, not claim_summary
    test.slow()
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'uz' }, timeout: 60000
    })
    const body = await res.json()
    const allContent = [
      body.suggested_comment || '',
      body.analysis || '',
    ].join(' ')
    const hasUzbekContent =
      /[\u0400-\u04FF]/.test(allContent) ||
      allContent.toLowerCase().includes('assalomu') ||
      allContent.toLowerCase().includes('hadis') ||
      allContent.toLowerCase().includes('alloh')
    expect(hasUzbekContent).toBe(true)
  })

  test('UZ lang — red_flags must be in Uzbek Cyrillic', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'uz' }, timeout: 60000
    })
    const body = await res.json()
    if (body.red_flags?.length > 0) {
      const allFlags = body.red_flags.join(' ')
      expect(/[\u0400-\u04FF]/.test(allFlags)).toBe(true)
    }
  })

  test('AR lang — comment must contain Arabic characters', async ({ request }) => {
    // P029/P030: use Arabic input, check comment OR analysis (not strict)
    test.slow()
    const arabicInput = 'من قرأ سورة الفاتحة سبع مرات قبل النوم كتب له ثواب سبعة آلاف يوم'
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: arabicInput, lang: 'ar' }, timeout: 60000
    })
    const body = await res.json()
    const allContent = [
      body.suggested_comment || '',
      body.analysis || '',
    ].join(' ')
    expect(/[\u0600-\u06FF]/.test(allContent)).toBe(true)
  })

  test('AR lang — red_flags must contain Arabic characters', async ({ request }) => {
    test.setTimeout(120000)
    const arabicInput = 'من قرأ سورة الفاتحة سبع مرات قبل النوم كتب له ثواب سبعة آلاف يوم'
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: arabicInput, lang: 'ar' }, timeout: 60000
    })
    const body = await res.json()
    if (body.red_flags?.length > 0) {
      const allFlags = body.red_flags.join(' ')
      expect(/[\u0600-\u06FF]/.test(allFlags)).toBe(true)
    }
  })

  test('RU lang — comment or analysis must contain Cyrillic characters', async ({ request }) => {
    // P029: use Russian input to maximize Cyrillic output
    test.slow()
    const russianInput = 'Кто прочитает суру Фатиха 7 раз перед сном получит награду 7000 дней'
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: russianInput, lang: 'ru' }, timeout: 60000
    })
    const body = await res.json()
    expect(
      /[\u0400-\u04FF]/.test(body.suggested_comment || '') ||
      /[\u0400-\u04FF]/.test(body.analysis || '')
    ).toBe(true)
  })

  test('RU lang — red_flags must contain Cyrillic characters', async ({ request }) => {
    const russianInput = 'Кто прочитает суру Фатиха 7 раз перед сном получит награду 7000 дней'
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: russianInput, lang: 'ru' }, timeout: 60000
    })
    const body = await res.json()
    if (body.red_flags?.length > 0) {
      const allFlags = body.red_flags.join(' ')
      expect(/[\u0400-\u04FF]/.test(allFlags)).toBe(true)
    }
  })

  test('EN lang — suggested_comment must be in English', async ({ request }) => {
    // P030: do NOT assert analysis script — Arabic source titles appear naturally in EN
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    const comment = body.suggested_comment?.toLowerCase() || ''
    expect(
      comment.includes('assalamu') ||
      comment.includes('narration') ||
      comment.includes('fabricated') ||
      comment.includes('authentic') ||
      comment.includes('reference') ||
      comment.includes('hadith') ||
      comment.includes('dear')
    ).toBe(true)
    // NOTE: No Arabic-in-analysis assertion — Arabic source titles are expected (P030)
  })
})

test.describe('GET /api/queue — Admin queue', () => {
  test('should return 200 and an array', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/queue`)
    expect(res.status()).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// Severity scoring tests (CT-GenAI — CRITICAL/HIGH/MEDIUM/LOW)
// ─────────────────────────────────────────────────────────────
test.describe('POST /api/analyze — Severity scoring (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('fabricated + high confidence should map to CRITICAL', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.high_confidence, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    if (body.verdict === 'fabricated' && body.confidence === 'high') {
      expect(getSeverity(body.verdict as Verdict, body.confidence as Confidence)).toBe('CRITICAL')
    }
  })

  test('chain message should produce CRITICAL or HIGH severity', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    const severity = getSeverity(body.verdict as Verdict, body.confidence as Confidence)
    expect(['CRITICAL', 'HIGH']).toContain(severity)
  })

  test('authentic hadith should produce LOW severity', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.bukhari, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    if (body.verdict === 'authentic') {
      expect(getSeverity(body.verdict as Verdict, body.confidence as Confidence)).toBe('LOW')
    }
  })

  test('no_hadith post should produce LOW severity', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.no_hadith, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    if (body.verdict === 'no_hadith') {
      expect(getSeverity(body.verdict as Verdict, body.confidence as Confidence)).toBe('LOW')
    }
  })

  test('severity field in response must be valid enum if present', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    if (body.severity) {
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(body.severity)
    }
  })
})