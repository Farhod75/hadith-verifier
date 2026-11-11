// tests/analyze-limit.spec.ts
// P396: lib/analyze-limit.ts - pure, no server, no browser.
import { test, expect } from '@playwright/test'
import { createRateLimiter, isBotRequest, rateLimitMessage, BOT_CALLER } from '../lib/analyze-limit'

const T = (h: number) => new Date(Date.UTC(2026, 10, 11, h, 5))

test('the bot key must be configured and match exactly', () => {
  expect(isBotRequest('k1', 'k1')).toBe(true)
  expect(isBotRequest('k1', 'k2')).toBe(false)
  expect(isBotRequest('k1', undefined)).toBe(false)     // no key on the server -> nobody is the bot
  expect(isBotRequest('', '')).toBe(false)
  expect(isBotRequest(null, 'k1')).toBe(false)
  expect(isBotRequest('k1x', 'k1')).toBe(false)
})

test('an IP gets 20 checks an hour, the bot gets its own larger cap', () => {
  const check = createRateLimiter({ daily: 1000, hourly: 20, botHourly: 200 })
  for (let i = 0; i < 20; i++) expect(check('1.2.3.4', 'en', T(9)).limited).toBe(false)
  expect(check('1.2.3.4', 'en', T(9)).limited).toBe(true)
  for (let i = 0; i < 200; i++) expect(check(BOT_CALLER, 'ru', T(9)).limited).toBe(false)
  const r = check(BOT_CALLER, 'ru', T(9))
  expect(r.limited).toBe(true)
  expect(r.message).toBe('Суточный лимит исчерпан. Попробуйте завтра.')
  expect(check('1.2.3.4', 'en', T(10)).limited).toBe(false)   // a new hour
})

test('the daily cap applies to everyone and counts only what was let through', () => {
  const check = createRateLimiter({ daily: 3, hourly: 2, botHourly: 10 })
  expect(check('a', 'en', T(9)).limited).toBe(false)
  expect(check('a', 'en', T(9)).limited).toBe(false)
  expect(check('a', 'en', T(9)).limited).toBe(true)          // refused by the hourly cap - not counted
  expect(check(BOT_CALLER, 'en', T(9)).limited).toBe(false)  // the third let through
  expect(check(BOT_CALLER, 'en', T(9)).limited).toBe(true)   // daily cap
})

test('the limit message exists in every reply language', () => {
  expect(rateLimitMessage('tj')).toContain('Фардо')
  expect(rateLimitMessage('uz')).toContain('Эртага')
  expect(rateLimitMessage('uz_latin')).toContain('Ertaga')
  expect(rateLimitMessage('xx')).toContain('Daily limit')
})
