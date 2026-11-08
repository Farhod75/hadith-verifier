// lib/queue-row.ts
// P381: the row /api/analyze writes to flagged_posts, built in one place so a test can hold it
// against the table. From 2026-05-11 the route inserted a `references` field; the table has
// `sources`, not `references`, so PostgREST refused every insert. supabase-js RETURNS that error
// instead of throwing it, and the route only had a try/catch, so for six months no fabricated or
// weak post reached the admin queue and nothing was logged.

// The table's columns (read from the live table 2026-11-08). id and reviewed are filled by the
// database; everything the route sends must be one of the rest.
export const FLAGGED_POSTS_COLUMNS = [
  'id', 'post_text', 'verdict', 'confidence', 'severity', 'claim_summary', 'analysis',
  'suggested_comment', 'lang', 'red_flags', 'sources', 'reviewed', 'created_at',
] as const

type AnalyzeResult = {
  verdict?: string; confidence?: string; severity?: string; claim_summary?: string
  analysis?: string; suggested_comment?: string; red_flags?: unknown[]; references?: unknown[]
}

export function queueRow(postText: string | null | undefined, result: AnalyzeResult, lang: string,
                         now: Date = new Date()) {
  return {
    post_text:         postText || '[image submission]',
    verdict:           result.verdict,
    confidence:        result.confidence,
    severity:          result.severity,
    claim_summary:     result.claim_summary,
    analysis:          result.analysis,
    suggested_comment: result.suggested_comment,
    lang,
    red_flags:         result.red_flags  || [],
    sources:           result.references || [],   // the model's references go in `sources`
    created_at:        now.toISOString(),
  }
}
