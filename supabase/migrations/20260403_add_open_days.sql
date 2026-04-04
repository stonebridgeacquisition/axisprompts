-- Add open_days column to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS open_days TEXT[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

-- Update the check_operating_hours function to respect open_days
CREATE OR REPLACE FUNCTION public.check_operating_hours()
RETURNS void AS $$
DECLARE
    current_wat_time TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos')::time;
    current_wat_day  TEXT := TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos', 'Dy');
BEGIN
    -- Open stores whose open_time is in the last 1 minute AND today is an open day
    UPDATE public.clients
    SET is_open = true
    WHERE is_open = false
      AND open_time <= current_wat_time
      AND open_time >= (current_wat_time - interval '1 minute')
      AND open_days @> ARRAY[current_wat_day];

    -- Close stores whose close_time is in the last 1 minute (regardless of day)
    -- This ensures manual opens on closed days still close at scheduled close_time
    UPDATE public.clients
    SET is_open = false
    WHERE is_open = true
      AND close_time <= current_wat_time
      AND close_time >= (current_wat_time - interval '1 minute');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
