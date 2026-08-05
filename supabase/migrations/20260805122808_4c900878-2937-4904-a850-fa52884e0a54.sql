-- Trigger functions must not be callable through the Data API; they only ever
-- run from their triggers, which execute as the table owner regardless.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.sync_track_counter() FROM anon, authenticated, public;

-- Play counting moves to a trusted server-side call, so no public
-- SECURITY DEFINER entry point is exposed.
DROP FUNCTION IF EXISTS public.increment_play_count(text);