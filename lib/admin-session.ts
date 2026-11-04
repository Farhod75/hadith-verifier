// lib/admin-session.ts
// P364: the admin queue had no gate at all. /api/queue answered GET, PATCH and
// DELETE to anyone, through the Supabase SERVICE ROLE key - so an anonymous
// request could read every flagged post (on 2026-11-04 a plain GET to
// https://hadithverifier.com/api/queue returned 200 and ~152 KB of them), mark
// any of them reviewed, or delete one by id. The admin tab in app/page.tsx had
// no login either; it simply called the route.
//
// Same guard as hadith-reels lib/admin-session.ts (P353), ported with its own
// cookie name so a session on one site is never a session on the other.
// A correct ADMIN_PASSWORD gets a signed, HttpOnly, SameSite=Strict cookie, and
// requireAdmin() checks it on the server before a route does anything else.
//
// Local development is the one exception: under `next dev` (NODE_ENV=development),
// never on Vercel, and only for a localhost Host header. The pre-push hook's mock
// server on :3011 and `npm run dev` rely on it. A cross-origin browser request is
// refused everywhere.

import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'hv_admin'
export const SESSION_TTL_SECONDS = 12 * 60 * 60

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

// ADMIN_SESSION_SECRET when set; otherwise the admin password itself, so the
// fix needs no new environment variable to work. Changing either one signs
// every existing session out.
function signingKey(): string | null {
  const key = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  return key ? key : null
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** The password check itself, constant-time. False when no password is configured. */
export function passwordMatches(candidate: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || typeof candidate !== 'string') return false
  return safeEqual(candidate, expected)
}

/** `v1.<expiry-seconds>.<hmac>`, or null when nothing is configured to sign with. */
export function issueSessionToken(now: number = Date.now()): string | null {
  const key = signingKey()
  if (!key) return null
  const payload = `v1.${Math.floor(now / 1000) + SESSION_TTL_SECONDS}`
  return `${payload}.${sign(payload, key)}`
}

export function verifySessionToken(token: string | undefined, now: number = Date.now()): boolean {
  const key = signingKey()
  if (!key || !token) return false
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1' || !/^\d+$/.test(parts[1])) return false
  if (Number(parts[1]) * 1000 <= now) return false
  return safeEqual(parts[2], sign(`v1.${parts[1]}`, key))
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path:     '/',
    maxAge:   SESSION_TTL_SECONDS,
  }
}

function hostname(hostHeader: string | null): string {
  if (!hostHeader) return ''
  // "[::1]:3002" -> "[::1]", "localhost:3002" -> "localhost"
  return hostHeader.startsWith('[')
    ? hostHeader.slice(0, hostHeader.indexOf(']') + 1)
    : hostHeader.split(':')[0]
}

/** `next dev` on this machine, reached by a localhost name. Never true on Vercel. */
export function isLocalDevRequest(req: NextRequest): boolean {
  return process.env.NODE_ENV === 'development'
      && !process.env.VERCEL
      && LOCAL_HOSTS.has(hostname(req.headers.get('host')).toLowerCase())
}

/**
 * Call first in every side-effecting route:
 *   const denied = requireAdmin(req); if (denied) return denied
 * Returns null when the request may proceed, otherwise the response to send.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin')
  if (origin) {
    let originHost = ''
    try { originHost = new URL(origin).host } catch { /* malformed -> refused below */ }
    if (originHost !== req.headers.get('host')) {
      return NextResponse.json({ error: 'cross-origin request refused' }, { status: 403 })
    }
  }
  if (isLocalDevRequest(req)) return null
  if (verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value)) return null
  return NextResponse.json({ error: 'admin session required - sign in on the Admin queue tab' }, { status: 401 })
}
