export type FlaggedPost = {
  id?: string
  post_text: string
  verdict: string
  confidence: string
  claim_summary: string
  analysis: string
  suggested_comment: string
  lang: string
  sources: object[]
  red_flags: string[]        // ← ADD
  severity: string           // ← ADD
  reviewed: boolean
  created_at?: string
}

// Supabase client is created lazily in API routes only
// to avoid build-time errors when env vars are not set
