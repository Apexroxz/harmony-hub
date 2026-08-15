-- ==============================================================================
-- Layam Digital Ownership & Certificate Provenance Migration
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.digital_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sha256_hash TEXT NOT NULL,
  audio_fingerprint TEXT NOT NULL,
  isrc_code TEXT,
  metadata_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  certificate_signature TEXT,
  mint_address TEXT,
  chain TEXT NOT NULL DEFAULT 'solana',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_certs_track ON public.digital_certificates(track_id);
CREATE INDEX IF NOT EXISTS idx_digital_certs_creator ON public.digital_certificates(creator_id);
CREATE INDEX IF NOT EXISTS idx_digital_certs_hash ON public.digital_certificates(sha256_hash);

-- Enable RLS
ALTER TABLE public.digital_certificates ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can view public digital certificates (for authenticity verification)
CREATE POLICY "Public can view digital certificates"
  ON public.digital_certificates FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Only authenticated track creators can issue certificates for their tracks
CREATE POLICY "Creators can issue certificates"
  ON public.digital_certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = digital_certificates.track_id
      AND tracks.uploader_id = auth.uid()::text
    )
  );
