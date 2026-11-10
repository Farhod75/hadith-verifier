// lib/health.ts
// P388: what /api/health reports about Claude, as pure functions so they are
// unit-tested without a network call.
//
// HV's past outages were not "the site is down": the page served and the database
// answered while every analysis failed, because the pinned model had been retired
// (P90, P129). A health check that only asked Supabase reported "ok" through both.

export type ClaudeState =
  | 'ok'                  // the key works and the model id exists
  | 'mocked'              // MOCK_CLAUDE=1 test server - no real calls by design
  | 'unconfigured'        // no API key in this deployment
  | 'auth_failed'         // key rejected (revoked, rotated, wrong workspace)
  | 'model_unavailable'   // the model id is retired or misspelled
  | 'unreachable'         // Anthropic did not answer, or answered 5xx / 429

/** Map the status of GET /v1/models/{id} to a state. */
export function claudeStateFromStatus(status: number): ClaudeState {
  if (status >= 200 && status < 300) return 'ok'
  if (status === 401 || status === 403) return 'auth_failed'
  if (status === 404) return 'model_unavailable'
  return 'unreachable'
}

export function claudeHealthy(s: ClaudeState) {
  return s === 'ok' || s === 'mocked'
}

/**
 * Asks Anthropic whether the model exists. GET /v1/models/{id} reads metadata
 * only: no tokens, no cost. It cannot see an exhausted credit balance - that
 * shows only on a real request (RECOVERY.md).
 */
export async function checkClaude(model: string, env = process.env): Promise<ClaudeState> {
  if (env.MOCK_CLAUDE === '1') return 'mocked'
  const key = env.ANTHROPIC_API_KEY || ''
  if (key.length < 20) return 'unconfigured'
  try {
    const res = await fetch(`https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`, {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    return claudeStateFromStatus(res.status)
  } catch {
    return 'unreachable'
  }
}
