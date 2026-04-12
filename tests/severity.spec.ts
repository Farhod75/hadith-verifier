// tests/severity-spec.ts
// Severity Scoring Tests for Hadith Verifier
// CT-GenAI Certification Portfolio — Severity Classification
// Covers: structure, logic, consistency, persistence

import { test, expect } from '@playwright/test'
import {
  FABRICATED_POSTS,
  AUTHENTIC_POSTS,
  } from './fixtures/test-data'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const VALID_SEVERITY_VALUES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

// ─────────────────────────────────────────────────────────────
// SUITE 1: Response structure
// ─────────────────────────────────────────────────────────────
test.describe('Severity — Response structure (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('severity field must be present in every response', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.severity).toBeDefined()
    expect(body.severity).not.toBeNull()
    expect(typeof body.severity).toBe('string')
  })

  test('severity must be one of CRITICAL, HIGH, MEDIUM, LOW', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    expect(VALID_SEVERITY_VALUES).toContain(body.severity)
  })

  test('severity must be uppercase', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    expect(body.severity).toBe(body.severity.toUpperCase())
  })

  test('severity must be present alongside red_flags array', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    expect(body.severity).toBeDefined()
    expect(Array.isArray(body.red_flags)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// SUITE 2: Severity logic — fabricated posts
// ─────────────────────────────────────────────────────────────
test.describe('Severity logic — Fabricated posts (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('Uzbek fabricated post: severity should be CRITICAL or HIGH', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'fabricated' && body.confidence === 'high') {
      expect(['CRITICAL', 'HIGH']).toContain(body.severity)
    } else {
      expect(VALID_SEVERITY_VALUES).toContain(body.severity)
    }
  })

  test('chain message: severity should be CRITICAL or HIGH', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'fabricated' || body.verdict === 'weak') {
      expect(['CRITICAL', 'HIGH']).toContain(body.severity)
    } else {
      expect(VALID_SEVERITY_VALUES).toContain(body.severity)
    }
  })

  test('Arabic fabricated post: severity should not be LOW', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.arabic, lang: 'ar' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'fabricated') {
      expect(body.severity).not.toBe('LOW')
    } else {
      expect(VALID_SEVERITY_VALUES).toContain(body.severity)
    }
  })

  test('Russian fabricated post: severity should not be LOW', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.russian, lang: 'ru' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'fabricated') {
      expect(body.severity).not.toBe('LOW')
    } else {
      expect(VALID_SEVERITY_VALUES).toContain(body.severity)
    }
  })

  test('fabricated + 2 or more red flags: must not be LOW', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'fabricated' && body.red_flags?.length >= 2) {
      expect(body.severity).not.toBe('LOW')
    }
  })
})

// ─────────────────────────────────────────────────────────────
// SUITE 3: Severity logic — authentic posts
// ─────────────────────────────────────────────────────────────
test.describe('Severity logic — Authentic posts (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('Bukhari hadith: authentic verdict should return LOW', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.bukhari, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'authentic') {
      expect(body.severity).toBe('LOW')
    } else {
      expect(VALID_SEVERITY_VALUES).toContain(body.severity)
    }
  })

  test('Ikhlas hadith: authentic verdict should return LOW', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.ikhlas, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'authentic') {
      expect(body.severity).toBe('LOW')
    } else {
      expect(VALID_SEVERITY_VALUES).toContain(body.severity)
    }
  })

  test('no_hadith verdict should return LOW severity', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: 'Today is a beautiful day, alhamdulillah', lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'no_hadith') {
      expect(body.severity).toBe('LOW')
    } else {
      expect(VALID_SEVERITY_VALUES).toContain(body.severity)
    }
  })
})

// ─────────────────────────────────────────────────────────────
// SUITE 4: Severity consistency — no contradictions
// CT-GenAI: AI output non-contradiction testing
// ─────────────────────────────────────────────────────────────
test.describe('Severity consistency — No contradictions (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('authentic verdict must never be CRITICAL or HIGH', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.intentions, lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'authentic') {
      expect(['CRITICAL', 'HIGH']).not.toContain(body.severity)
    }
  })

  test('no_hadith verdict must never be CRITICAL or HIGH', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: 'Alhamdulillah for everything', lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'no_hadith') {
      expect(['CRITICAL', 'HIGH']).not.toContain(body.severity)
    }
  })

  test('CRITICAL severity must only appear with fabricated or weak verdict', async ({ request }) => {
    const posts = [
      { postText: FABRICATED_POSTS.chain_message, lang: 'en' },
      { postText: FABRICATED_POSTS.uzbek, lang: 'en' },
      { postText: AUTHENTIC_POSTS.bukhari, lang: 'en' },
    ]
    for (const data of posts) {
      const res = await request.post(`${BASE_URL}/api/analyze`, {
        data,
        timeout: 60000,
      })
      const body = await res.json()
      if (body.severity === 'CRITICAL') {
        expect(['fabricated', 'weak']).toContain(body.verdict)
      }
    }
  })

  test('weak verdict must not return CRITICAL severity', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: 'The Prophet said: Cleanliness is half of faith.', lang: 'en' },
      timeout: 60000,
    })
    const body = await res.json()
    if (body.verdict === 'weak') {
      expect(body.severity).not.toBe('CRITICAL')
    }
  })
})

// ─────────────────────────────────────────────────────────────
// SUITE 5: Persistence — severity saved to Supabase
// ─────────────────────────────────────────────────────────────
test.describe('Severity persistence — Supabase queue (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('GET /api/queue returns array', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/queue`)
    expect(res.status()).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })

  test('queue records must include severity field', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/queue`)
    const body = await res.json()
    if (body.length > 0) {
      expect(body[0].severity).toBeDefined()
      expect(VALID_SEVERITY_VALUES).toContain(body[0].severity)
    }
  })

  test('queue records must include red_flags array', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/queue`)
    const body = await res.json()
    if (body.length > 0) {
      expect(Array.isArray(body[0].red_flags)).toBe(true)
    }
  })
})