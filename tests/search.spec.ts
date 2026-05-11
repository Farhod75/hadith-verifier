import { test, expect, request } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

test.describe('GET /api/search — Hadith Search', () => {

  test('returns 400 when no q or tag provided', async () => {
    const ctx = await request.newContext()
    const res = await ctx.get(`${BASE_URL}/api/search`)
    expect(res.status()).toBe(400)
  })

  test('returns results for keyword search', async () => {
    const ctx = await request.newContext()
    const res = await ctx.get(`${BASE_URL}/api/search?q=intentions`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  test('returns results for tag search', async () => {
    const ctx = await request.newContext()
    const res = await ctx.get(`${BASE_URL}/api/search?tag=salah`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('each result has required fields', async () => {
    const ctx = await request.newContext()
    const res = await ctx.get(`${BASE_URL}/api/search?q=prayer`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    if (body.length > 0) {
      const h = body[0]
      expect(h.id).toBeTruthy()
      expect(h.text_arabic).toBeTruthy()
      expect(h.narrator).toBeTruthy()
      expect(h.collection).toBeTruthy()
      expect(h.grade).toBeTruthy()
      expect(Array.isArray(h.tags)).toBe(true)
    }
  })

  test('grade filter works', async () => {
    const ctx = await request.newContext()
    const res = await ctx.get(`${BASE_URL}/api/search?q=faith&grade=sahih`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    body.forEach((h: any) => {
      expect(h.grade).toBe('sahih')
    })
  })

  test('returns max 20 results', async () => {
    const ctx = await request.newContext()
    const res = await ctx.get(`${BASE_URL}/api/search?q=the`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.length).toBeLessThanOrEqual(20)
  })

  test('lang=uz returns uzbek translation', async () => {
    const ctx = await request.newContext()
    const res = await ctx.get(`${BASE_URL}/api/search?q=intentions&lang=uz`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})