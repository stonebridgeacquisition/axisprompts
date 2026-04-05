-- Add columns to transactions table for payment expiry support
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS order_items JSONB,
ADD COLUMN IF NOT EXISTS order_metadata JSONB;

-- Add concurrency lock column to chat_sessions
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS agent_lock_until TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient pending payment expiry queries
CREATE INDEX IF NOT EXISTS idx_transactions_pending_expiry
ON public.transactions(status, expires_at)
WHERE status = 'pending';
