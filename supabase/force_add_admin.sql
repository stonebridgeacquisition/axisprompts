-- Force Insert Admin User
-- This script trusts the email address and ignores RLS temporarily to insert the user.

-- 1. Insert into admin_users if not exists
INSERT INTO public.admin_users (id, email, role)
SELECT id, email, 'owner'
FROM auth.users
WHERE email = 'esskvy111@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- 2. Verify it worked
SELECT * FROM public.admin_users WHERE email = 'esskvy111@gmail.com';
