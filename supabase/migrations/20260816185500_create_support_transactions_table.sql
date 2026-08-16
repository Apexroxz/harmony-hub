-- ==============================================================================
-- Migration: 20260816185500_create_support_transactions_table.sql
-- Description: Create public.support_transactions table for voluntary developer contributions.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.support_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'apple_iap', 'google_play', 'manual')),
  provider_transaction_id TEXT CHECK (provider_transaction_id IS NULL OR length(provider_transaction_id) <= 255),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0 AND amount <= 100000.00),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (length(currency) >= 3 AND length(currency) <= 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  platform TEXT NOT NULL CHECK (platform IN ('macos', 'windows', 'linux', 'android', 'ios', 'web')),
  app_version TEXT NOT NULL DEFAULT '1.0.0-offline' CHECK (length(app_version) <= 50)
);

COMMENT ON TABLE public.support_transactions IS 'Voluntary developer contributions and donations for Layam Hi-Fi Player.';
COMMENT ON COLUMN public.support_transactions.provider IS 'Payment processor: stripe (web/desktop), apple_iap (iOS), google_play (Android), or manual.';
COMMENT ON COLUMN public.support_transactions.amount IS 'Contribution amount in specified currency.';
COMMENT ON COLUMN public.support_transactions.status IS 'Transaction status: pending, completed, failed, cancelled, or refunded.';

-- Performance & lookup indexes
CREATE INDEX IF NOT EXISTS idx_support_transactions_status ON public.support_transactions (status);
CREATE INDEX IF NOT EXISTS idx_support_transactions_provider_id ON public.support_transactions (provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_support_transactions_created_at ON public.support_transactions (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_transactions ENABLE ROW LEVEL SECURITY;

-- Deny public reading or client modification of contribution records
CREATE POLICY "Deny public select on support_transactions"
  ON public.support_transactions
  FOR SELECT
  TO anon, public
  USING (false);

-- Only privileged service_role (Edge Functions and Webhook) can insert and update transactions
CREATE POLICY "Allow service_role full manage on support_transactions"
  ON public.support_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
