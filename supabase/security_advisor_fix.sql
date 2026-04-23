-- Fix Supabase Security Advisor ERRORs:
-- - 0010 security_definer_view
-- - 0013 rls_disabled_in_public
--
-- Run this in Supabase SQL Editor against the affected project.

BEGIN;

-- Views in public should not run with the creator's privileges.
ALTER VIEW IF EXISTS public.daily_stats SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_room_snapshot SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_dashboard_stays_kst SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_stay_history SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_dashboard_stats_kst SET (security_invoker = on);

-- These dashboard/history views are consumed through protected Next.js API
-- routes using the service role key, not directly from browser Supabase calls.
DO $$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'daily_stats',
    'v_room_snapshot',
    'v_dashboard_stays_kst',
    'v_stay_history',
    'v_dashboard_stats_kst'
  ]
  LOOP
    IF to_regclass(format('public.%I', view_name)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', view_name);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO service_role', view_name);
    END IF;
  END LOOP;
END $$;

-- wanted_offs should be protected by RLS. The app's server routes use service
-- role for admin operations; authenticated Supabase users retain CRUD access
-- if Supabase Auth is enabled later.
ALTER TABLE public.wanted_offs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to wanted_offs for authenticated" ON public.wanted_offs;
CREATE POLICY "Allow all access to wanted_offs for authenticated"
  ON public.wanted_offs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.wanted_offs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wanted_offs TO authenticated, service_role;

COMMIT;
