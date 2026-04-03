-- Create access_codes table for one-time use onboarding codes
CREATE TABLE IF NOT EXISTS public.access_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    used_by UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable row-level security
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Admin can do everything with codes
CREATE POLICY "Admin full access" ON public.access_codes
    FOR ALL USING (auth.role() = 'authenticated');

-- Public can only SELECT to validate a code
CREATE POLICY "Public can validate code" ON public.access_codes
    FOR SELECT USING (true);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_used ON public.access_codes(used);
