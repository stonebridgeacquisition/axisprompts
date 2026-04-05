-- Add operating_hours JSONB column for per-day schedules
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT NULL;

-- Backfill existing restaurants: map open_days to operating_hours
-- All open days get the same open_time and close_time
UPDATE public.clients
SET operating_hours = (
    SELECT jsonb_object_agg(
        day,
        jsonb_build_object(
            'open',  TO_CHAR(open_time,  'HH24:MI'),
            'close', TO_CHAR(close_time, 'HH24:MI')
        )
    )
    FROM unnest(open_days) AS day
)
WHERE open_days IS NOT NULL
  AND array_length(open_days, 1) > 0
  AND open_time IS NOT NULL
  AND close_time IS NOT NULL;

-- Replace check_operating_hours function with per-day support
-- Supports both new (operating_hours JSONB) and legacy (open_time/close_time/open_days) paths
CREATE OR REPLACE FUNCTION public.check_operating_hours()
RETURNS void AS $$
DECLARE
    current_wat_time  TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos')::time;
    current_wat_day   TEXT := TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos', 'Dy');
BEGIN
    -- ========== NEW PATH: operating_hours JSONB ==========

    -- OPEN: New path — when today's day exists in operating_hours and open time is within last 1 minute
    UPDATE public.clients
    SET is_open = true
    WHERE is_open = false
      AND operating_hours IS NOT NULL
      AND operating_hours ? current_wat_day           -- day key exists in JSONB
      AND (operating_hours -> current_wat_day ->> 'open')::TIME <= current_wat_time
      AND (operating_hours -> current_wat_day ->> 'open')::TIME >= (current_wat_time - interval '1 minute');

    -- CLOSE at scheduled close time: New path — when today's day exists and close time is within last 1 minute
    UPDATE public.clients
    SET is_open = false
    WHERE is_open = true
      AND operating_hours IS NOT NULL
      AND operating_hours ? current_wat_day           -- day exists, normal scheduled close
      AND (operating_hours -> current_wat_day ->> 'close')::TIME <= current_wat_time
      AND (operating_hours -> current_wat_day ->> 'close')::TIME >= (current_wat_time - interval '1 minute');

    -- CLOSE immediately: New path — manually opened on a day not in operating_hours (closed day)
    -- This handles the edge case where operator manually opens a store on a day it should be closed
    UPDATE public.clients
    SET is_open = false
    WHERE is_open = true
      AND operating_hours IS NOT NULL
      AND NOT (operating_hours ? current_wat_day);    -- today's key is absent = closed day

    -- ========== LEGACY PATH: open_time/close_time/open_days ==========

    -- OPEN: Legacy fallback — when operating_hours is null and using old columns
    UPDATE public.clients
    SET is_open = true
    WHERE is_open = false
      AND operating_hours IS NULL
      AND open_time <= current_wat_time
      AND open_time >= (current_wat_time - interval '1 minute')
      AND open_days @> ARRAY[current_wat_day];

    -- CLOSE: Legacy fallback — when operating_hours is null (does not filter by open_days)
    UPDATE public.clients
    SET is_open = false
    WHERE is_open = true
      AND operating_hours IS NULL
      AND close_time <= current_wat_time
      AND close_time >= (current_wat_time - interval '1 minute');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GIN index for efficient JSONB queries in the cron function
CREATE INDEX IF NOT EXISTS idx_clients_operating_hours
ON public.clients USING gin (operating_hours)
WHERE operating_hours IS NOT NULL;
