-- Transactions Table for Payment Tracking
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT NOT NULL, -- ManyChat User ID
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, success, expired
    subaccount_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by reference
CREATE INDEX idx_transactions_reference ON public.transactions(reference);

-- Policy: Clients view own transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own transactions" ON public.transactions
    USING (auth.uid() IN (SELECT user_id FROM public.clients WHERE id = client_id));
