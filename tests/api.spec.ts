import { test, expect } from '@playwright/test'
import { FABRICATED_POSTS, AUTHENTIC_POSTS, VALID_SOURCE_DOMAINS } from './fixtures/test-data'

// ============================================================
// HADITH VERIFIER — API TESTS
// CT-GenAI Certification Portfolio
// Tests: API contract, response structure, AI output validation
// ============================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('POST /api/analyze — Request validation', () => {
  test('should return 400 when postText is empty', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: '', lang: 'en' }
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  test('should return 400 when postText is missing', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { lang: 'en' }
    })
    expect(res.status()).toBe(400)
  })

  test('should return 200 with valid text input', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000
    })
    expect(res.status()).toBe(200)
  })
})

test.describe('POST /api/analyze — Response structure (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('should return all required fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000
    })

    expect(res.status()).toBe(200)
    const body = await res.json()

    // All required fields must be present
    expect(body.verdict).toBeDefined()
    expect(body.confidence).toBeDefined()
    expect(body.claim_summary).toBeDefined()
    expect(body.analysis).toBeDefined()
    expect(body.suggested_comment).toBeDefined()
    expect(body.references).toBeDefined()
    expect(Array.isArray(body.references)).toBe(true)
  })

  test('verdict must be one of valid values', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    const validVerdicts = ['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith']
    expect(validVerdicts).toContain(body.verdict)
  })

  test('confidence must be high, medium, or low', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    expect(['high', 'medium', 'low']).toContain(body.confidence)
  })

  test('red_flags should be an array', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    expect(Array.isArray(body.red_flags)).toBe(true)
  })

  test('references should have source, url, authority fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    if (body.references?.length > 0) {
      const ref = body.references[0]
      expect(ref.source).toBeDefined()
      expect(ref.url).toBeDefined()
      expect(ref.authority).toBeDefined()
      expect(['tier1', 'tier2', 'tier3']).toContain(ref.authority)
    }
  })
})

test.describe('POST /api/analyze — AI quality tests (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('fabricated Uzbek post should return fabricated or weak verdict', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    expect(['fabricated', 'weak']).toContain(body.verdict)
  })

  test('chain message should be detected as fabricated', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    expect(['fabricated', 'weak']).toContain(body.verdict)
  })

  test('authentic Bukhari hadith should return authentic verdict', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.bukhari, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    expect(body.verdict).toBe('authentic')
  })

  test('should detect chain message pressure in red_flags', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    const allFlags = body.red_flags?.join(' ').toLowerCase() || ''
    const hasChainFlag =
      allFlags.includes('chain') ||
      allFlags.includes('share') ||
      allFlags.includes('pressure')
    expect(hasChainFlag).toBe(true)
  })
})

test.describe('POST /api/analyze — Hallucination detection (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('URLs in references should be from valid Islamic sources', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    if (body.references?.length > 0) {
      for (const ref of body.references) {
        if (ref.url && ref.url.startsWith('http')) {
          const isValidDomain = VALID_SOURCE_DOMAINS.some(domain =>
            ref.url.includes(domain)
          )
          expect(isValidDomain).toBe(true)
        }
      }
    }
  })

  test('suggested_comment should not be empty or undefined', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    expect(body.suggested_comment).toBeTruthy()
    expect(body.suggested_comment.length).toBeGreaterThan(30)
    expect(body.suggested_comment).not.toBe('undefined')
    expect(body.suggested_comment).not.toContain('[object')
  })

  test('analysis field should be meaningful text not placeholder', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000
    })

    const body = await res.json()
    expect(body.analysis.length).toBeGreaterThan(50)
    expect(body.analysis).not.toContain('2-3 sentences')
    expect(body.analysis).not.toContain('[placeholder]')
  })
})

test.describe('POST /api/analyze — Language tests (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('UZ lang should produce Uzbek comment with Uzbek greeting', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'uz' },
      timeout: 60000
    })

    const body = await res.json()
    const comment = body.suggested_comment?.toLowerCase() || ''
    const hasUzbekGreeting =
      comment.includes('assalomu') ||
      comment.includes('alaykum') ||
      comment.includes('alloh') ||
      comment.includes('hadis')
    expect(hasUzbekGreeting).toBe(true)
  })

  test('AR lang should produce comment with Arabic characters', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'ar' },
      timeout: 60000
    })

    const body = await res.json()
    const hasArabic = /[\u0600-\u06FF]/.test(body.suggested_comment || '')
    expect(hasArabic).toBe(true)
  })

  test('RU lang should produce comment with Cyrillic characters', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'ru' },
      timeout: 60000
    })

    const body = await res.json()
    const hasCyrillic = /[\u0400-\u04FF]/.test(body.suggested_comment || '')
    expect(hasCyrillic).toBe(true)
  })
})

test.describe('GET /api/queue — Admin queue', () => {
  test('should return 200 and an array', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/queue`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
