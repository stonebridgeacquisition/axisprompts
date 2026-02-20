-- Create delivery_fees table (similar to menu_items)
CREATE TABLE IF NOT EXISTS public.delivery_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    fee NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add delivery config columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS delivery_fee_image_url TEXT;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'rider_collects';

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- Drop the old JSONB column if it exists (moved to separate table)
ALTER TABLE public.clients
DROP COLUMN IF EXISTS delivery_fees;

-- Enable RLS
ALTER TABLE public.delivery_fees ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own delivery fees
CREATE POLICY "Users can view own delivery fees" ON public.delivery_fees
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own delivery fees
CREATE POLICY "Users can insert own delivery fees" ON public.delivery_fees
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update their own delivery fees
CREATE POLICY "Users can update own delivery fees" ON public.delivery_fees
    FOR UPDATE USING (true);

-- Allow authenticated users to delete their own delivery fees
CREATE POLICY "Users can delete own delivery fees" ON public.delivery_fees
    FOR DELETE USING (true);
