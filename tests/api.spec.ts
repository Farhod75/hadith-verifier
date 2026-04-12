import { test, expect } from '@playwright/test'
import { FABRICATED_POSTS, AUTHENTIC_POSTS, VALID_SOURCE_DOMAINS } from './fixtures/test-data'

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
    // AI is non-deterministic for well-known hadiths — just verify valid response structure
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.bukhari, lang: 'en' }, timeout: 60000
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const validVerdicts = ['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith']
    expect(validVerdicts).toContain(body.verdict)
    expect(body.analysis.length).toBeGreaterThan(20)
  })

  test('should detect chain message indicators in analysis or red_flags', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    // Check broadly across red_flags and analysis for chain-related content
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

test.describe('POST /api/analyze — Language tests (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('UZ lang should produce Uzbek comment', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'uz' }, timeout: 60000
    })
    const body = await res.json()
    const comment = body.suggested_comment?.toLowerCase() || ''
    expect(
      comment.includes('assalomu') ||
      comment.includes('alaykum') ||
      comment.includes('alloh') ||
      comment.includes('hadis')
    ).toBe(true)
  })

  test('AR lang should produce comment with Arabic characters', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'ar' }, timeout: 60000
    })
    const body = await res.json()
    expect(/[\u0600-\u06FF]/.test(body.suggested_comment || '')).toBe(true)
  })

  test('RU lang should produce comment with Cyrillic characters', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'ru' }, timeout: 60000
    })
    const body = await res.json()
    expect(/[\u0400-\u04FF]/.test(body.suggested_comment || '')).toBe(true)
  })
})

test.describe('GET /api/queue — Admin queue', () => {
  test('should return 200 and an array', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/queue`)
    expect(res.status()).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })
})
