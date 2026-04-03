-- Add follow-up tracking columns to chat_sessions
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS last_assistant_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_user_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_sent BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS follow_up_eligible BOOLEAN DEFAULT TRUE NOT NULL;

-- Add follow-up configuration to clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS follow_up_delay_minutes INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS follow_up_enabled BOOLEAN DEFAULT TRUE NOT NULL;

-- Index for efficient cron query
CREATE INDEX IF NOT EXISTS idx_sessions_followup_candidates
ON public.chat_sessions (follow_up_sent, follow_up_eligible, last_assistant_message_at)
WHERE follow_up_sent = FALSE AND follow_up_eligible = TRUE;
