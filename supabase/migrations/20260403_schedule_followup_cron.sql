-- Schedule the follow-up messaging cron job to run every 5 minutes
SELECT cron.schedule(
  'send-followups-check',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://chwxcfzqjxyorewehcwa.supabase.co/functions/v1/send-followups',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
