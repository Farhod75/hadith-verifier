import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

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
  reviewed: boolean
  created_at?: string
}

// SQL to run in Supabase dashboard → SQL Editor:
// 
// CREATE TABLE flagged_posts (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   post_text TEXT NOT NULL,
//   verdict TEXT NOT NULL,
//   confidence TEXT,
//   claim_summary TEXT,
//   analysis TEXT,
//   suggested_comment TEXT,
//   lang TEXT DEFAULT 'en',
//   sources JSONB DEFAULT '[]',
//   reviewed BOOLEAN DEFAULT false,
//   created_at TIMESTAMPTZ DEFAULT now()
// );
//
// -- Allow public read/write (adjust for production auth)
// ALTER TABLE flagged_posts ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Allow all" ON flagged_posts FOR ALL USING (true);
