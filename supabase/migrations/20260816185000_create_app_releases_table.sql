-- ==============================================================================
-- Migration: 20260816185000_create_app_releases_table.sql
-- Description: Create public.app_releases table for Layam Hi-Fi release management.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT NOT NULL CHECK (length(trim(version)) >= 1 AND length(version) <= 50),
  platform TEXT NOT NULL CHECK (platform IN ('macos', 'windows', 'linux', 'android', 'ios', 'web')),
  channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable', 'beta', 'dev')),
  release_title TEXT CHECK (release_title IS NULL OR length(trim(release_title)) <= 255),
  release_notes TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  download_url TEXT CHECK (download_url IS NULL OR length(trim(download_url)) <= 2048),
  installer_type TEXT CHECK (installer_type IS NULL OR installer_type IN ('dmg', 'exe', 'msi', 'deb', 'rpm', 'AppImage', 'apk', 'ipa', 'pwa', 'zip', 'tar.gz')),
  sha256 TEXT CHECK (sha256 IS NULL OR length(trim(sha256)) <= 128),
  signature TEXT,
  minimum_supported_version TEXT CHECK (minimum_supported_version IS NULL OR length(minimum_supported_version) <= 50),
  is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE public.app_releases IS 'Official software releases and patch notes for Layam Hi-Fi Player across desktop, mobile, and web targets.';
COMMENT ON COLUMN public.app_releases.version IS 'Semantic version string (e.g. 1.0.0, 1.0.1).';
COMMENT ON COLUMN public.app_releases.platform IS 'Target OS or runtime environment: macos, windows, linux, android, ios, or web.';
COMMENT ON COLUMN public.app_releases.channel IS 'Distribution channel: stable, beta, or dev.';
COMMENT ON COLUMN public.app_releases.minimum_supported_version IS 'Minimum version required for backwards compatibility and cloud services.';

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_app_releases_lookup ON public.app_releases (platform, channel, version);
CREATE INDEX IF NOT EXISTS idx_app_releases_published_at ON public.app_releases (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_releases_is_active ON public.app_releases (is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Allow public and anonymous users to read only active release records
CREATE POLICY "Allow public read active releases"
  ON public.app_releases
  FOR SELECT
  TO anon, authenticated, public
  USING (is_active = true);

-- Allow service_role complete operational control (publishing, toggling active state)
CREATE POLICY "Allow service_role full manage on app_releases"
  ON public.app_releases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
