// lib/analyze-limit.ts
// /api/analyze's caps, moved out of the route so they can be tested (P396).
// (lib/rate-limit.ts is P366's limiter for /api/tts - a different shape, left as is.)
//
// In memory, per server instance: a global daily cap, and an hourly cap per caller.
// A caller is the client IP - except the HV Telegram bot. Every bot request comes
// from one Railway IP, so under the per-IP cap the 21st check of the hour from ALL
// bot users would be refused. When the request carries x-hv-bot-key equal to the
// HV_BOT_KEY environment variable, the caller is 'telegram-bot' with its own,
// larger hourly cap; the bot also caps each Telegram user itself. The global daily
// cap applies to everyone.

import { timingSafeEqual } from 'crypto'

export const DAILY_CAP = 500
export const HOURLY_CAP = 20
export const BOT_HOURLY_CAP = 200
export const BOT_CALLER = 'telegram-bot'

/** True only when a bot key is configured and the header matches it exactly. */
export function isBotRequest(header: string | null | undefined, configuredKey: string | undefined): boolean {
  if (!configuredKey || !header) return false
  const a = Buffer.from(header, 'utf8')
  const b = Buffer.from(configuredKey, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function rateLimitMessage(lang: string): string {
  if (lang === 'ar') return 'تم تجاوز الحد اليومي. يُرجى المحاولة غداً.'
  if (lang === 'ru') return 'Суточный лимит исчерпан. Попробуйте завтра.'
  if (lang === 'uz_latin') return 'Kunlik limit tugadi. Ertaga urinib koʻring.'
  if (lang === 'uz' || lang === 'uz_cyrillic') return 'Кунлик лимит тугади. Эртага уриниб кўринг.'
  if (lang === 'tj') return 'Маҳдудияти рӯзона ба охир расид. Фардо боз кӯшиш кунед.'
  return 'Daily limit reached. Please try again tomorrow.'
}

export function createRateLimiter(opts: { daily?: number; hourly?: number; botHourly?: number } = {}) {
  const daily = opts.daily ?? DAILY_CAP
  const hourly = opts.hourly ?? HOURLY_CAP
  const botHourly = opts.botHourly ?? BOT_HOURLY_CAP
  const global = { count: 0, date: '' }
  const callers = new Map<string, { count: number; hour: string }>()

  return function check(caller: string, lang: string, now: Date = new Date()): { limited: boolean; message: string } {
    const today = now.toISOString().slice(0, 10)
    const hour = now.toISOString().slice(0, 13)
    if (global.date !== today) { global.date = today; global.count = 0 }
    if (global.count >= daily) return { limited: true, message: rateLimitMessage(lang) }
    const cap = caller === BOT_CALLER ? botHourly : hourly
    const entry = callers.get(caller) || { count: 0, hour: '' }
    if (entry.hour !== hour) { entry.count = 0; entry.hour = hour }
    if (entry.count >= cap) return { limited: true, message: rateLimitMessage(lang) }
    entry.count++
    callers.set(caller, entry)
    global.count++          // counted only when the request is let through
    return { limited: false, message: '' }
  }
}
