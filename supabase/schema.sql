-- Add baby_names column to stays table
ALTER TABLE stays 
ADD COLUMN IF NOT EXISTS baby_names TEXT[] DEFAULT '{}';

-- Optional: Update existing records to have empty array if null (though default handles new ones)
UPDATE stays SET baby_names = '{}' WHERE baby_names IS NULL;

-- Add stay detail columns used by room cards/forms
ALTER TABLE stays
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS baby_weight NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS birth_hospital TEXT,
ADD COLUMN IF NOT EXISTS baby_profiles JSONB DEFAULT '[]'::jsonb;

-- Wanted Offs Table
CREATE TABLE IF NOT EXISTS wanted_offs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  wanted_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(staff_id, wanted_date)
);

-- RLS Policies (if enabled/needed)
ALTER TABLE wanted_offs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to wanted_offs for authenticated" ON wanted_offs;
CREATE POLICY "Allow all access to wanted_offs for authenticated" ON wanted_offs FOR ALL USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- Read optimization helpers
-- -----------------------------------------------------------------------------

-- KST helper date (used by dashboard view)
CREATE OR REPLACE FUNCTION public.kst_today()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::date
$$;

-- Room snapshot for room dashboard/list rendering
CREATE OR REPLACE VIEW public.v_room_snapshot AS
SELECT
  r.room_number,
  r.room_type,
  r.floor,
  to_jsonb(a) AS active_stay,
  COALESCE(u.upcoming_stays, '[]'::jsonb) AS upcoming_stays,
  to_jsonb(a) AS current_stay
FROM rooms r
LEFT JOIN LATERAL (
  SELECT s.*
  FROM stays s
  WHERE s.room_number = r.room_number
    AND s.status = 'active'
  ORDER BY s.check_in_date DESC
  LIMIT 1
) a ON TRUE
LEFT JOIN LATERAL (
  SELECT jsonb_agg(to_jsonb(s) ORDER BY s.check_in_date ASC) AS upcoming_stays
  FROM stays s
  WHERE s.room_number = r.room_number
    AND s.status = 'upcoming'
) u ON TRUE;

GRANT SELECT ON public.v_room_snapshot TO anon, authenticated, service_role;

-- KST dashboard summary (single-row view)
CREATE OR REPLACE VIEW public.v_dashboard_stats_kst AS
WITH k AS (
  SELECT public.kst_today() AS base_date
)
SELECT
  k.base_date,
  COALESCE(SUM(s.baby_count) FILTER (
    WHERE s.status = 'active'
      AND s.check_in_date <= k.base_date
      AND s.check_out_date > k.base_date
  ), 0)::integer AS total_newborns,
  COUNT(s.id) FILTER (
    WHERE s.status = 'active'
      AND s.check_in_date <= k.base_date
      AND s.check_out_date > k.base_date
  )::integer AS total_mothers,
  COUNT(s.id) FILTER (
    WHERE s.check_in_date = k.base_date
      AND s.status IN ('active', 'upcoming')
  )::integer AS today_checkins,
  COUNT(s.id) FILTER (
    WHERE s.check_out_date = k.base_date
      AND s.status = 'active'
  )::integer AS today_checkouts,
  COUNT(s.id) FILTER (
    WHERE s.check_in_date = (k.base_date + 1)
      AND s.status IN ('active', 'upcoming')
  )::integer AS tomorrow_checkins,
  COUNT(s.id) FILTER (
    WHERE s.check_out_date = (k.base_date + 1)
      AND s.status = 'active'
  )::integer AS tomorrow_checkouts
FROM k
LEFT JOIN stays s ON TRUE
GROUP BY k.base_date;

GRANT SELECT ON public.v_dashboard_stats_kst TO anon, authenticated, service_role;

-- Completed history projection
CREATE OR REPLACE VIEW public.v_stay_history AS
SELECT *
FROM stays
WHERE status = 'completed';

GRANT SELECT ON public.v_stay_history TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Indexes for frequent filters/sorts
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_stays_room_status_checkin
  ON stays (room_number, status, check_in_date);

CREATE INDEX IF NOT EXISTS idx_stays_status_checkin
  ON stays (status, check_in_date);

CREATE INDEX IF NOT EXISTS idx_stays_status_checkout
  ON stays (status, check_out_date);

CREATE INDEX IF NOT EXISTS idx_schedules_work_date
  ON schedules (work_date);

CREATE INDEX IF NOT EXISTS idx_wanted_offs_wanted_date
  ON wanted_offs (wanted_date);
