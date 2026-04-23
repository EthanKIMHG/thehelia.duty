-- Add chart-sheet fields used by stay registration/edit drawer.
-- Run this in Supabase SQL Editor before deploying the matching app code.

BEGIN;

ALTER TABLE public.stays
ADD COLUMN IF NOT EXISTS delivery_type TEXT
CHECK (delivery_type IN ('N/D', 'C/S') OR delivery_type IS NULL);

-- Recreate explicit dashboard stay view so delivery_type is available to APIs.
CREATE OR REPLACE VIEW public.v_dashboard_stays_kst
WITH (security_invoker=on) AS
WITH k AS (
  SELECT public.kst_today() AS base_date
)
SELECT
  s.id,
  s.room_number,
  s.mother_name,
  s.baby_count,
  s.baby_names,
  s.baby_profiles,
  s.gender,
  s.baby_weight,
  s.birth_hospital,
  s.check_in_date,
  s.check_out_date,
  s.edu_date,
  s.notes,
  s.status,
  k.base_date,
  (s.check_in_date = k.base_date AND s.status IN ('active', 'upcoming')) AS is_today_checkin,
  (s.check_out_date = k.base_date AND s.status = 'active') AS is_today_checkout,
  (s.check_in_date = (k.base_date + 1) AND s.status IN ('active', 'upcoming')) AS is_tomorrow_checkin,
  (s.check_out_date = (k.base_date + 1) AND s.status = 'active') AS is_tomorrow_checkout,
  (s.status = 'active' AND s.check_in_date <= k.base_date AND s.check_out_date > k.base_date) AS is_census,
  s.delivery_type
FROM stays s
CROSS JOIN k
WHERE s.status IN ('active', 'upcoming');

REVOKE ALL ON TABLE public.v_dashboard_stays_kst FROM anon, authenticated;
GRANT SELECT ON TABLE public.v_dashboard_stays_kst TO service_role;

COMMIT;
