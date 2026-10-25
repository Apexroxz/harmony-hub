-- ==============================================================================
-- Migration: 20260816184500_create_feedback_table.sql
-- Description: Create standalone feedback table for Layam Hi-Fi Player.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT NOT NULL CHECK (category IN ('general', 'audio_dsp', 'bug', 'idea')),
  message TEXT NOT NULL CHECK (length(trim(message)) >= 1 AND length(message) <= 5000),
  email TEXT CHECK (email IS NULL OR (length(trim(email)) <= 255 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')),
  app_version TEXT NOT NULL DEFAULT '1.0.0-offline' CHECK (length(app_version) <= 50),
  platform TEXT NOT NULL DEFAULT 'web' CHECK (length(platform) <= 50),
  os_version TEXT CHECK (os_version IS NULL OR length(os_version) <= 50),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'archived'))
);

COMMENT ON TABLE public.feedback IS 'User-submitted feedback, bug reports, and audio feature suggestions for Layam Hi-Fi Player.';
COMMENT ON COLUMN public.feedback.category IS 'Category of feedback: general, audio_dsp, bug, or idea.';
COMMENT ON COLUMN public.feedback.message IS 'Feedback message text (1-5000 characters).';
COMMENT ON COLUMN public.feedback.email IS 'Optional user email for follow-up communications.';
COMMENT ON COLUMN public.feedback.status IS 'Triage status: open, in_progress, resolved, closed, or archived.';

-- Query optimization indexes for Supabase Dashboard Table Editor
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON public.feedback (category);

-- Enable Row Level Security (RLS)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Deny public reading of user feedback records to protect privacy
-- Only privileged/service_role tooling or admin dashboard can select
CREATE POLICY "Deny public select"
  ON public.feedback
  FOR SELECT
  TO anon, public
  USING (false);

-- Allow service_role complete operational access (Edge Functions and Dashboard)
CREATE POLICY "Service role full access on feedback"
  ON public.feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
