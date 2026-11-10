import { NextResponse } from 'next/server'
import { CLAUDE_MODEL } from '@/lib/models'
import { checkClaude, claudeHealthy, type ClaudeState } from '@/lib/health'

// Health probe for the session pre-flight (HR CLAUDE.md step 4) and the uptime
// monitor (P388).
//
// It answers two questions: can this deployment reach Supabase, and does its
// Claude model still exist for its key. 200 only when both hold; 503 otherwise,
// so a monitor that watches the status code alone catches either. It reports NO
// environment detail - no URL, no key, no model id - because it is
// unauthenticated and public. The route it replaces in spirit, /api/test, did
// report that, which is why it was removed in the same change.
//
// Added 2026-10-22 (P291). Claude check added 2026-11-10 (P388): HV's outages
// (P90, P129) were a retired model while the database answered, so the DB-only
// check said "ok" through them.

export const dynamic = 'force-dynamic'

// A healthy Claude answer is reused for 5 minutes: a monitor polling every
// minute must not turn into a request to Anthropic every minute. Failures are
// never cached, so recovery shows on the next poll.
let claudeOkAt = 0
const CLAUDE_OK_TTL_MS = 5 * 60 * 1000

async function claudeState(): Promise<ClaudeState> {
  if (Date.now() - claudeOkAt < CLAUDE_OK_TTL_MS) return 'ok'
  const s = await checkClaude(CLAUDE_MODEL)
  if (s === 'ok') claudeOkAt = Date.now()
  return s
}

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

async function dbState(): Promise<'reachable' | 'unreachable' | 'unconfigured'> {
  const supabase = getSupabase()
  if (!supabase) return 'unconfigured'
  try {
    // head + exact count is the cheapest round trip that proves the database
    // actually answered, rather than that the client object constructed.
    const { error } = await supabase
      .from('hadith_library')
      .select('id', { count: 'exact', head: true })
    return error ? 'unreachable' : 'reachable'
  } catch {
    return 'unreachable'
  }
}

export async function GET() {
  const started = Date.now()
  const [db, claude] = await Promise.all([dbState(), claudeState()])
  const ok = db === 'reachable' && claudeHealthy(claude)
  return NextResponse.json(
    { status: ok ? 'ok' : 'degraded', db, claude, ms: Date.now() - started },
    { status: ok ? 200 : 503 }
  )
}
