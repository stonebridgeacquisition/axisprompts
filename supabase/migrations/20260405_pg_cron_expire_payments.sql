-- pg_cron job: Call expire-pending-payments edge function every minute
-- This replaces Inngest's 30-min waitForEvent timer from payment.js

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every minute
SELECT cron.schedule(
    'expire-pending-payments',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/expire-pending-payments',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
        ),
        body := '{}'::jsonb
    );
    $$
);
