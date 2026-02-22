-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add open_time and close_time columns
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS open_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS close_time TIME DEFAULT '22:00:00';

-- Create a function that checks for store openings/closings based on WAT (West Africa Time)
-- It updates is_open to true when crossing open_time, and false when crossing close_time.
CREATE OR REPLACE FUNCTION public.check_operating_hours()
RETURNS void AS $$
DECLARE
    current_wat_time TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos')::time;
BEGIN
    -- This function is meant to run frequently (e.g., every 1 minute).
    -- It checks if the current time exactly passed an opening or closing time recently.
    
    -- Check for stores that should OPEN right now
    -- If open_time was in the last 1 minute...
    UPDATE public.clients
    SET is_open = true
    WHERE is_open = false
      AND open_time <= current_wat_time
      AND open_time >= (current_wat_time - interval '1 minute');

    -- Check for stores that should CLOSE right now
    -- If close_time was in the last 1 minute...
    UPDATE public.clients
    SET is_open = false
    WHERE is_open = true
      AND close_time <= current_wat_time
      AND close_time >= (current_wat_time - interval '1 minute');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every 1 minute
-- Job runs as a background worker
SELECT cron.schedule('check-operating-hours', '* * * * *', 'SELECT public.check_operating_hours()');
