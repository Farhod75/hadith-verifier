// lib/rate-limit.ts
// P366: a small fixed-window limiter for public routes that spend money.
//
// In-memory and per server instance - on Vercel each warm instance keeps its
// own counts and a cold start resets them. That is a brake on a loop or a
// careless script hammering one instance, not a global quota. A real quota
// needs shared storage (Upstash/Redis or a Supabase table); recorded as open.

export type Limiter = {
  /** true when this key may make one more call now; counts the call. */
  take(key: string, now?: number): boolean
  /** seconds until this key's window resets (0 when it is not limited). */
  retryAfter(key: string, now?: number): number
}

export function createLimiter(limit: number, windowMs: number, maxKeys = 5000): Limiter {
  const hits = new Map<string, { start: number; count: number }>()

  function current(key: string, now: number) {
    const e = hits.get(key)
    if (!e || now - e.start >= windowMs) return null
    return e
  }

  return {
    take(key, now = Date.now()) {
      const e = current(key, now)
      if (!e) {
        if (hits.size >= maxKeys) {
          // Drop expired entries; if every one is live, drop the oldest.
          hits.forEach((v, k) => { if (now - v.start >= windowMs) hits.delete(k) })
          if (hits.size >= maxKeys) {
            const oldest = Array.from(hits.keys())[0]
            if (oldest !== undefined) hits.delete(oldest)
          }
        }
        hits.set(key, { start: now, count: 1 })
        return true
      }
      if (e.count >= limit) return false
      e.count++
      return true
    },
    retryAfter(key, now = Date.now()) {
      const e = current(key, now)
      if (!e || e.count < limit) return 0
      return Math.ceil((e.start + windowMs - now) / 1000)
    },
  }
}

/** The caller's address as Vercel reports it; 'unknown' when there is none. */
export function clientKey(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}
