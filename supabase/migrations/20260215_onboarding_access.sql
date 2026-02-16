-- Migration: Add platform settings for onboarding access control
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Initial data
INSERT INTO public.platform_settings (key, value)
VALUES ('onboarding_access_code', 'AXIS2026')
ON CONFLICT (key) DO NOTHING;

-- Policies
DROP POLICY IF EXISTS "Public can read platform settings" ON public.platform_settings;
CREATE POLICY "Public can read platform settings" 
    ON public.platform_settings FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Admins can update platform settings" 
    ON public.platform_settings FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.admin_users));
