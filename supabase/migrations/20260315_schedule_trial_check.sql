-- Enable pg_net extension for making HTTP requests from SQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule check-trial-expiry to run daily at 4:00 AM UTC (8:00 AM UTC+4)
SELECT cron.schedule(
  'check-trial-expiry-daily',
  '0 4 * * *',
  $$
    SELECT net.http_post(
      url := 'https://chwxcfzqjxyorewehcwa.supabase.co/functions/v1/check-trial-expiry',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
