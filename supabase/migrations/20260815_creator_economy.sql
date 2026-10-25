-- ==============================================================================
-- Layam Creator Economy & Royalty Ledger Migration
-- ==============================================================================

-- 1. Creator Rights Assets
CREATE TABLE IF NOT EXISTS public.creator_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('master', 'publishing', 'collaborator', 'license')),
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_assets_track ON public.creator_assets(track_id);
CREATE INDEX IF NOT EXISTS idx_creator_assets_creator ON public.creator_assets(creator_id);

-- 2. Revenue Splits
CREATE TABLE IF NOT EXISTS public.revenue_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_splits_track ON public.revenue_splits(track_id);
CREATE INDEX IF NOT EXISTS idx_revenue_splits_creator ON public.revenue_splits(creator_id);

-- 3. Royalty Transactions (Immutable Ledger)
CREATE TABLE IF NOT EXISTS public.royalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT REFERENCES public.tracks(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('stream', 'purchase', 'tip', 'subscription', 'license')),
  amount NUMERIC(12, 4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_royalty_transactions_creator ON public.royalty_transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_royalty_transactions_track ON public.royalty_transactions(track_id);
CREATE INDEX IF NOT EXISTS idx_royalty_transactions_event ON public.royalty_transactions(event_type);

-- 4. Artist Tips
CREATE TABLE IF NOT EXISTS public.artist_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  artist_id TEXT NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT DEFAULT 'fiat',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_tips_artist ON public.artist_tips(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_tips_sender ON public.artist_tips(sender_id);

-- 5. Artist Subscriptions
CREATE TABLE IF NOT EXISTS public.artist_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_subs_artist ON public.artist_subscriptions(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_subs_user ON public.artist_subscriptions(user_id);

-- 6. Payout Accounts
CREATE TABLE IF NOT EXISTS public.payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'bank_transfer', 'usdc', 'solana')),
  account_status TEXT NOT NULL DEFAULT 'unverified' CHECK (account_status IN ('unverified', 'pending', 'verified', 'suspended')),
  account_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_accounts_creator ON public.payout_accounts(creator_id);

-- 7. Payout Batches
CREATE TABLE IF NOT EXISTS public.payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_batches_creator ON public.payout_batches(creator_id);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.creator_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;

-- 1. creator_assets policies
CREATE POLICY "Creators can view their own assets"
  ON public.creator_assets FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Track uploaders can manage assets"
  ON public.creator_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = creator_assets.track_id
      AND tracks.uploader_id = auth.uid()::text
    )
  );

-- 2. revenue_splits policies
CREATE POLICY "Collaborators can view their splits"
  ON public.revenue_splits FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Track uploaders can manage splits"
  ON public.revenue_splits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = revenue_splits.track_id
      AND tracks.uploader_id = auth.uid()::text
    )
  );

-- 3. royalty_transactions policies (Append-only Ledger)
CREATE POLICY "Creators can view own royalty transactions"
  ON public.royalty_transactions FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Immutable: No direct INSERT/UPDATE/DELETE by standard authenticated users.
-- Insertions occur via server functions / service role.

-- 4. artist_tips policies
CREATE POLICY "Anyone can view artist tips"
  ON public.artist_tips FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can post tips"
  ON public.artist_tips FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- 5. artist_subscriptions policies
CREATE POLICY "Users can view their subscriptions"
  ON public.artist_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their subscriptions"
  ON public.artist_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- 6. payout_accounts policies
CREATE POLICY "Creators can view and update own payout account"
  ON public.payout_accounts FOR ALL
  TO authenticated
  USING (creator_id = auth.uid());

-- 7. payout_batches policies
CREATE POLICY "Creators can view own payout batches"
  ON public.payout_batches FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());
