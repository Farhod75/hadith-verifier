// lib/shared-limit.ts
// P411: a counter shared by every Vercel instance, in Supabase (public.bump_counter,
// supabase/migrations/20261112_rate_counters.sql). The P366 limiter (lib/rate-limit.ts)
// and the P405 video caps lived in one instance's memory: a cold start reset them and
// two instances counted separately, so "30 videos a day" was not a hard 30.
//
// bump_counter adds 1 to (key, current window) only while the count is under the cap,
// atomically, and answers whether this call is allowed. Windows are aligned to UTC
// (a 86400 s window is a UTC day).

export type BumpResult = true | false | null   // allowed | over the cap | store unavailable

type FetchLike = (url: string, init: RequestInit) => Promise<{ ok: boolean; json(): Promise<any> }>

export async function bumpCounter(
  key: string, windowSeconds: number, cap: number,
  opts: { url?: string; serviceKey?: string; fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<BumpResult> {
  const url = opts.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = opts.serviceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, i) => fetch(u, i))
  try {
    const r = await doFetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/bump_counter`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key: key, p_window_seconds: windowSeconds, p_cap: cap }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 3000),
    })
    if (!r.ok) return null
    const v = await r.json()
    return v === true ? true : v === false ? false : null
  } catch {
    return null
  }
}

/** Seconds until the current aligned window ends. */
export function secondsToWindowEnd(windowSeconds: number, nowMs = Date.now()): number {
  const s = Math.floor(nowMs / 1000)
  return windowSeconds - (s % windowSeconds)
}
