-- ============================================
-- HADITH VERIFIER — Supabase Database Schema
-- ============================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Then click "Run"

-- Main table for flagged posts
CREATE TABLE flagged_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_text TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('fabricated', 'weak', 'authentic', 'unclear', 'no_hadith')),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  claim_summary TEXT,
  analysis TEXT,
  suggested_comment TEXT,
  lang TEXT DEFAULT 'en' CHECK (lang IN ('en', 'uz', 'ar', 'ru')),
  sources JSONB DEFAULT '[]',
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queue queries
CREATE INDEX idx_flagged_posts_reviewed ON flagged_posts(reviewed);
CREATE INDEX idx_flagged_posts_verdict ON flagged_posts(verdict);
CREATE INDEX idx_flagged_posts_created ON flagged_posts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE flagged_posts ENABLE ROW LEVEL SECURITY;

-- Policy: allow all for now (tighten for production with auth)
CREATE POLICY "Allow all operations" ON flagged_posts
  FOR ALL USING (true) WITH CHECK (true);

-- Stats view (useful for dashboard)
CREATE VIEW queue_stats AS
SELECT
  COUNT(*) FILTER (WHERE reviewed = false) AS pending,
  COUNT(*) FILTER (WHERE verdict = 'fabricated') AS total_fabricated,
  COUNT(*) FILTER (WHERE verdict = 'weak') AS total_weak,
  COUNT(*) FILTER (WHERE verdict = 'authentic') AS total_authentic,
  COUNT(*) AS total_analyzed
FROM flagged_posts;
