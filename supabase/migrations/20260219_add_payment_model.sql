-- Add payment_model column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_model TEXT DEFAULT 'subscription';

-- Update existing clients to 'subscription' model
UPDATE public.clients SET payment_model = 'subscription' WHERE payment_model IS NULL;
