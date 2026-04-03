-- Create a PostgreSQL function to efficiently fetch follow-up candidates
CREATE OR REPLACE FUNCTION public.get_followup_candidates()
RETURNS TABLE (
  id UUID,
  client_id UUID,
  whatsapp_user_id TEXT,
  last_assistant_message_at TIMESTAMPTZ,
  last_user_message_at TIMESTAMPTZ,
  business_name TEXT,
  follow_up_delay_minutes INTEGER,
  whatsapp_phone_number_id TEXT,
  whatsapp_access_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.client_id,
    s.whatsapp_user_id,
    s.last_assistant_message_at,
    s.last_user_message_at,
    c.business_name,
    c.follow_up_delay_minutes,
    c.whatsapp_phone_number_id,
    c.whatsapp_access_token
  FROM public.chat_sessions s
  JOIN public.clients c ON s.client_id = c.id
  WHERE s.follow_up_sent = FALSE
    AND s.follow_up_eligible = TRUE
    AND s.last_assistant_message_at IS NOT NULL
    AND s.last_user_message_at IS NOT NULL
    AND s.last_assistant_message_at > s.last_user_message_at
    AND s.last_user_message_at > NOW() - INTERVAL '24 hours'
    AND c.follow_up_enabled = TRUE
    AND c.status = 'Active'
    AND c.is_open = TRUE
    AND s.last_assistant_message_at < NOW() - (c.follow_up_delay_minutes || ' minutes')::INTERVAL
  ORDER BY s.last_assistant_message_at ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
