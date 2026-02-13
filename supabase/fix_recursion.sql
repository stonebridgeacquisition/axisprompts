-- FIX INFINITE RECURSION ERROR (42P17)

-- 1. Drop existing policies to clear the bad state
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view self" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admins" ON public.admin_users;

-- 2. Create a SECURITY DEFINER function
-- This function runs with the privileges of the creator (postgres/admin), 
-- bypassing RLS on the table itself. This prevents the infinite loop.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Create the new policy using the function
-- This allows admins to view ALL rows in the table.
CREATE POLICY "Admins can view all"
  ON public.admin_users FOR SELECT
  USING ( public.is_admin() );

-- 4. Ensure your user is still in the admin list (just to be safe)
INSERT INTO public.admin_users (id, email, role)
SELECT id, email, 'owner'
FROM auth.users
WHERE email = 'esskvy111@gmail.com'
ON CONFLICT (id) DO NOTHING;
