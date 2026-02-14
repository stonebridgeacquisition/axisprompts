
-- Create admin_users table if not exists (it should exist)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view themselves
CREATE POLICY "Admins can view own admin data" ON public.admin_users
    FOR SELECT
    USING (auth.uid() = id);

-- Function to make a user an admin
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
    
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.admin_users (id, email)
        VALUES (target_user_id, user_email)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
