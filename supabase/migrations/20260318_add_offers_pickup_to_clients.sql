-- Add offers_pickup column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS offers_pickup boolean DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.clients.offers_pickup IS 'Whether the business offers order pickup at their location.';
