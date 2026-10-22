import { NextResponse } from 'next/server'

// Health probe for the session pre-flight (HR CLAUDE.md step 4).
//
// It answers exactly one question: is this deployment serving AND can it reach
// Supabase. It reports NO environment detail - no URL, no key length, no
// whether an integration is configured - because it is unauthenticated and
// public. The route it replaces in spirit, /api/test, did report that, which
// is why it was removed in the same change.
//
// Added 2026-10-22. The pre-flight had been curling /api/health since the
// checklist was written and the route had never existed, so every session
// opened on a 404 that nobody read as a missing route.

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  if (!url.startsWith('https://') || key.length < 20) return null
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export async function GET() {
  const started = Date.now()
  const supabase = getSupabase()

  if (!supabase) {
    return NextResponse.json(
      { status: 'degraded', db: 'unconfigured', ms: Date.now() - started },
      { status: 503 }
    )
  }

  try {
    // head + exact count is the cheapest round trip that proves the database
    // actually answered, rather than that the client object constructed.
    const { error } = await supabase
      .from('hadith_library')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json(
        { status: 'degraded', db: 'unreachable', ms: Date.now() - started },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      db: 'reachable',
      ms: Date.now() - started,
    })
  } catch {
    return NextResponse.json(
      { status: 'degraded', db: 'unreachable', ms: Date.now() - started },
      { status: 503 }
    )
  }
}