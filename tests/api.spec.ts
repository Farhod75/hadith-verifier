// tests/api.spec.ts
// P060: AI quality tests tagged @real-api — non-deterministic, skip in pre-push
// Structure:
//   Request validation  → fast status checks ✅ pre-push
//   Response structure  → schema/enum checks ✅ pre-push
//   AI quality          → @real-api (Claude verdicts non-deterministic)
//   Admin queue         → no Claude ✅ pre-push (P364: 200 under local `next dev`, 401 otherwise; P383)
//   Admin session       → pure unit tests of lib/admin-session.ts (P364)
//   Severity unit tests → pure function ✅ pre-push

import { test, expect } from '@playwright/test'
import {
  FABRICATED_POSTS,
  AUTHENTIC_POSTS,
  VALID_SOURCE_DOMAINS,
  getSeverity,
  type Verdict,
  type Confidence
} from './fixtures/test-data'
import { NextRequest } from 'next/server'
import {
  ADMIN_COOKIE, SESSION_TTL_SECONDS, issueSessionToken, verifySessionToken,
  passwordMatches, requireAdmin,
} from '../lib/admin-session'
import { queueRow, FLAGGED_POSTS_COLUMNS } from '../lib/queue-row'
import { BASE_URL, isLocalNextDev } from './fixtures/server-mode'

// ─────────────────────────────────────────────────────────────
// Request validation
// ─────────────────────────────────────────────────────────────
test.describe('POST /api/analyze — Request validation', () => {
  test('should return 400 when postText is empty', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: '', lang: 'en' }
    })
    expect(res.status()).toBe(400)
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

  test('image upload should not return parse error (P035)', async ({ request }) => {
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
    expect(body.error).toBeUndefined()
    expect(['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith']).toContain(body.verdict)
  })
})

// ─────────────────────────────────────────────────────────────
// Response structure — schema/enum only
// ─────────────────────────────────────────────────────────────
test.describe('POST /api/analyze — Response structure (CT-GenAI)', () => {
  test.setTimeout(90000)

  test('should return all required fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(body.verdict).toBeDefined()
    expect(body.confidence).toBeDefined()
    expect(body.severity).toBeDefined()
    expect(body.claim_summary).toBeDefined()
    expect(body.analysis).toBeDefined()
    expect(body.suggested_comment).toBeDefined()
    expect(Array.isArray(body.references)).toBe(true)
    expect(Array.isArray(body.red_flags)).toBe(true)
  })

  test('should return seerah_context field', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    expect((await res.json())).toHaveProperty('seerah_context')
  })

  test('verdict must be valid enum', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    expect(['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith'])
      .toContain((await res.json()).verdict)
  })

  test('confidence must be valid enum', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    expect(['high', 'medium', 'low'])
      .toContain((await res.json()).confidence)
  })

  test('severity must be valid enum', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
      .toContain((await res.json()).severity)
  })

  test('references must have source url authority', async ({ request }) => {
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

// ─────────────────────────────────────────────────────────────
// AI quality tests — @real-api (non-deterministic, skip pre-push)
// P060: Claude sometimes returns 'unclear' for chain messages
// Run manually: npx playwright test tests/api.spec.ts --grep @real-api
// ─────────────────────────────────────────────────────────────
test.describe('POST /api/analyze — AI quality @real-api', () => {
  test.setTimeout(90000)

  test('@real-api fabricated Uzbek should return fabricated weak or unclear', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    // Accept unclear — Claude non-deterministic (P060)
    expect(['fabricated', 'weak', 'unclear']).toContain((await res.json()).verdict)
  })

  test('@real-api chain message should be fabricated weak or unclear', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.chain_message, lang: 'en' }, timeout: 60000
    })
    expect(['fabricated', 'weak', 'unclear']).toContain((await res.json()).verdict)
  })

  test('@real-api suggested_comment must have content', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const comment = ((await res.json()).suggested_comment || '').toLowerCase()
    expect(
      comment.length > 30 ||
      comment.includes('assalamu') || comment.includes('hadith') ||
      comment.includes('fabricated') || comment.includes('dear')
    ).toBe(true)
  })

  test('@real-api authentic Bukhari should return valid verdict', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: AUTHENTIC_POSTS.bukhari, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    expect(['fabricated', 'weak', 'authentic', 'unclear', 'no_hadith']).toContain(body.verdict)
    expect(body.analysis.length).toBeGreaterThan(20)
  })
})

// ─────────────────────────────────────────────────────────────
// Admin queue
// ─────────────────────────────────────────────────────────────
// P364: the queue needs an admin session. `next dev` on localhost is the one
// exception (lib/admin-session.ts), so the pre-push mock server on :3011 still
// gets the list; any other server - the deployed site (CI runs this against
// https://hadithverifier.com) or a production build on localhost (`next start`,
// P383) - must refuse an anonymous caller on every method.

test.describe('GET /api/queue', () => {
  test('local dev server: 200 and array', async ({ request }) => {
    test.skip(!(await isLocalNextDev()), 'not `next dev` - covered by the 401 tests below')
    const res = await request.get(`${BASE_URL}/api/queue`)
    expect(res.status()).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })

  test('deployed site: anonymous GET is refused and lists nothing', async ({ request }) => {
    test.skip(await isLocalNextDev(), 'next dev on localhost is the documented exception')
    const res = await request.get(`${BASE_URL}/api/queue`)
    expect(res.status()).toBe(401)
    expect(Array.isArray(await res.json())).toBe(false)
  })

  for (const method of ['PATCH', 'DELETE'] as const) {
    test(`deployed site: anonymous ${method} is refused`, async ({ request }) => {
      test.skip(await isLocalNextDev(), 'next dev on localhost is the documented exception')
      // A made-up id: even if the guard were missing, nothing real is touched.
      const res = await request.fetch(`${BASE_URL}/api/queue`, {
        method, data: { id: '00000000-0000-0000-0000-000000000000' },
      })
      expect(res.status()).toBe(401)
    })
  }

  test('deployed site: a forged session cookie is refused', async ({ request }) => {
    test.skip(await isLocalNextDev(), 'next dev on localhost is the documented exception')
    const exp = Math.floor(Date.now() / 1000) + 3600
    const res = await request.get(`${BASE_URL}/api/queue`, {
      headers: { cookie: `hv_admin=v1.${exp}.forged-signature` },
    })
    expect(res.status()).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────
// Admin session — unit tests (P364), no server, no network
// ─────────────────────────────────────────────────────────────
test.describe('Admin session — lib/admin-session.ts', () => {
  const env = process.env as Record<string, string | undefined>
  const saved = { ...env }
  const KEYS = ['ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'VERCEL', 'NODE_ENV']

  test.beforeEach(() => {
    env.ADMIN_PASSWORD = 'correct horse'
    delete env.ADMIN_SESSION_SECRET
    delete env.VERCEL
    env.NODE_ENV = 'production'
  })
  test.afterEach(() => {
    for (const k of KEYS) { if (saved[k] === undefined) delete env[k]; else env[k] = saved[k] }
  })

  function req(url: string, headers: Record<string, string> = {}) {
    return new NextRequest(url, { method: 'GET', headers: { host: new URL(url).host, ...headers } })
  }

  test('password: exact match only, nothing matches when none is configured', () => {
    expect(passwordMatches('correct horse')).toBe(true)
    expect(passwordMatches('correct horse ')).toBe(false)
    expect(passwordMatches(undefined)).toBe(false)
    delete env.ADMIN_PASSWORD
    expect(passwordMatches('')).toBe(false)
  })

  test('token: fresh verifies, expired and tampered do not', () => {
    const now = Date.now()
    const token = issueSessionToken(now)!
    expect(verifySessionToken(token, now)).toBe(true)
    expect(verifySessionToken(token, now + (SESSION_TTL_SECONDS + 1) * 1000)).toBe(false)
    const [v, exp, sig] = token.split('.')
    expect(verifySessionToken(`${v}.${Number(exp) + 3600}.${sig}`)).toBe(false)
    // P369: replace the last character with a DIFFERENT one. Appending 'A' after
    // slice(0,-1) re-created the original token whenever the signature already
    // ended in 'A' (1 run in 64), and CI went red on a correct guard.
    const last = sig.slice(-1)
    expect(verifySessionToken(`${v}.${exp}.${sig.slice(0, -1)}${last === 'A' ? 'B' : 'A'}`)).toBe(false)
    expect(verifySessionToken('')).toBe(false)
  })

  test('changing the password signs every session out', () => {
    const token = issueSessionToken()!
    env.ADMIN_PASSWORD = 'new password'
    expect(verifySessionToken(token)).toBe(false)
  })

  test('production: no cookie -> 401, valid cookie -> allowed', () => {
    expect(requireAdmin(req('https://hadithverifier.com/api/queue'))?.status).toBe(401)
    const cookie = `${ADMIN_COOKIE}=${issueSessionToken()}`
    expect(requireAdmin(req('https://hadithverifier.com/api/queue', { cookie }))).toBeNull()
  })

  test('the HR cookie name is not accepted here', () => {
    const cookie = `hr_admin=${issueSessionToken()}`
    expect(ADMIN_COOKIE).toBe('hv_admin')
    expect(requireAdmin(req('https://hadithverifier.com/api/queue', { cookie }))?.status).toBe(401)
  })

  test('cross-origin is refused even with a valid cookie', () => {
    const cookie = `${ADMIN_COOKIE}=${issueSessionToken()}`
    expect(requireAdmin(req('https://hadithverifier.com/api/queue',
      { cookie, origin: 'https://evil.example' }))?.status).toBe(403)
  })

  test('next dev on localhost passes; Vercel, LAN host and next start do not', () => {
    env.NODE_ENV = 'development'
    expect(requireAdmin(req('http://localhost:3011/api/queue'))).toBeNull()
    expect(requireAdmin(req('http://192.168.1.20:3011/api/queue'))?.status).toBe(401)
    env.VERCEL = '1'
    expect(requireAdmin(req('http://localhost:3011/api/queue'))?.status).toBe(401)
    delete env.VERCEL
    env.NODE_ENV = 'production'
    expect(requireAdmin(req('http://localhost:3011/api/queue'))?.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────
// Severity scoring — pure unit tests (P044)
// ─────────────────────────────────────────────────────────────
test.describe('Severity scoring — unit tests (CT-GenAI)', () => {
  test('fabricated + high → CRITICAL', () => {
    expect(getSeverity('fabricated' as Verdict, 'high' as Confidence)).toBe('CRITICAL')
  })
  test('fabricated + medium → HIGH', () => {
    expect(getSeverity('fabricated' as Verdict, 'medium' as Confidence)).toBe('HIGH')
  })
  test('fabricated + low → HIGH', () => {
    expect(getSeverity('fabricated' as Verdict, 'low' as Confidence)).toBe('HIGH')
  })
  test('weak + high → HIGH', () => {
    expect(getSeverity('weak' as Verdict, 'high' as Confidence)).toBe('HIGH')
  })
  test('weak + medium → MEDIUM', () => {
    expect(getSeverity('weak' as Verdict, 'medium' as Confidence)).toBe('MEDIUM')
  })
  test('weak + low → MEDIUM', () => {
    expect(getSeverity('weak' as Verdict, 'low' as Confidence)).toBe('MEDIUM')
  })
  test('authentic + any → LOW', () => {
    expect(getSeverity('authentic' as Verdict, 'high' as Confidence)).toBe('LOW')
    expect(getSeverity('authentic' as Verdict, 'medium' as Confidence)).toBe('LOW')
  })
  test('no_hadith → LOW', () => {
    expect(getSeverity('no_hadith' as Verdict, 'high' as Confidence)).toBe('LOW')
  })
  test('unclear → MEDIUM', () => {
    expect(getSeverity('unclear' as Verdict, 'high' as Confidence)).toBe('MEDIUM')
  })
  test('severity field in API response is valid enum', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analyze`, {
      data: { postText: FABRICATED_POSTS.uzbek, lang: 'en' }, timeout: 60000
    })
    const body = await res.json()
    if (body.severity) {
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(body.severity)
    }
  })
})

// ─────────────────────────────────────────────────────────────
// Queue row — unit tests (P381), no server, no network
// ─────────────────────────────────────────────────────────────
test.describe('Queue row — lib/queue-row.ts (P381)', () => {
  const result = {
    verdict: 'fabricated', confidence: 'high', severity: 'CRITICAL', claim_summary: 'c',
    analysis: 'a', suggested_comment: 's', red_flags: ['f'], references: [{ url: 'https://dorar.net/x' }],
  }

  test('every field the route sends is a column of flagged_posts', () => {
    // 2026-05-11 to 2026-11-08 the route sent `references`, which is not a column: every insert failed.
    const keys = Object.keys(queueRow('post', result, 'uz'))
    expect(keys.filter(k => !(FLAGGED_POSTS_COLUMNS as readonly string[]).includes(k))).toEqual([])
  })

  test('the model references are saved as sources', () => {
    const row = queueRow('post', result, 'uz', new Date('2026-11-08T00:00:00Z'))
    expect(row.sources).toEqual(result.references)
    expect(row).not.toHaveProperty('references')
    expect(row.created_at).toBe('2026-11-08T00:00:00.000Z')
  })

  test('an image submission without text gets a placeholder', () => {
    expect(queueRow('', result, 'en').post_text).toBe('[image submission]')
    expect(queueRow(undefined, { verdict: 'weak' }, 'en').sources).toEqual([])
  })
})
