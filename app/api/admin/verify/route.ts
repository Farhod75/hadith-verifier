// app/api/admin/verify/route.ts
// P364: the Admin queue password. ADMIN_PASSWORD lives in the environment only
// (Vercel project settings, .env.local for local login) - never in the code.
// A correct password sets the signed session cookie that /api/queue checks
// (lib/admin-session.ts). Without ADMIN_PASSWORD nobody can sign in, and the
// queue stays closed: requireAdmin() has nothing to verify a cookie against.

import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE, issueSessionToken, passwordMatches, sessionCookieOptions,
} from '@/lib/admin-session'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })
    }

    if (passwordMatches(password)) {
      const token = issueSessionToken()
      const res = NextResponse.json({ ok: true })
      if (token) res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions())
      return res
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
