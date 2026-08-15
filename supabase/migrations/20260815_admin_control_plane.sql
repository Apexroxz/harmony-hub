-- ==============================================================================
-- Layam Phase 5: Admin Control Plane Architecture Migration
-- ==============================================================================

-- 1. Admin Permissions & Role Assignments
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('moderator', 'content_admin', 'finance_admin', 'super_admin')),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_admin_role UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_admin_perms_user ON public.admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_perms_role ON public.admin_permissions(role);

-- 2. Immutable Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'user', 'creator', 'track', 'report', 'payout', 'setting'
  resource_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at DESC);

-- 3. Content Moderation & Copyright Reports
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('track', 'user', 'comment', 'creator')),
  resource_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('copyright', 'explicit', 'spam', 'harassment', 'fraud', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_reports_status ON public.moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_mod_reports_resource ON public.moderation_reports(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_mod_reports_created ON public.moderation_reports(created_at DESC);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

-- Helper Function to check if caller is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = user_uid
  );
$$;

-- 1. admin_permissions policies
CREATE POLICY "Admins can view admin permissions"
  ON public.admin_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_permissions
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage admin permissions"
  ON public.admin_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_permissions
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 2. admin_audit_logs policies: APPEND-ONLY, readable by admins
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert audit logs via server functions"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Explicitly block updates and deletes to preserve audit log immutability
-- (No UPDATE or DELETE policies created)

-- 3. moderation_reports policies
CREATE POLICY "Users can create moderation reports"
  ON public.moderation_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reporters can view their own reports"
  ON public.moderation_reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid() OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can update moderation reports"
  ON public.moderation_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
