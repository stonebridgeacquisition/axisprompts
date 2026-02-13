-- Fix RLS Policies to prevent lockout
-- We need a policy that explicitly allows a user to read THEIR OWN row.
-- This bootstraps the ability to check "Am I an admin?" which is needed for broader access.

DROP POLICY IF EXISTS "Admins can view all admins" ON public.admin_users;

-- 1. Simple policy: You can always see your own record.
-- This allows the Login check `select * from admin_users where id = user.id` to succeed.
CREATE POLICY "Admins can view self"
  ON public.admin_users FOR SELECT
  USING ( auth.uid() = id );

-- 2. Broader policy: If you are an admin (i.e. you exist in the table), you can view everyone.
-- Since "Admins can view self" guarantees you can see yourself, the subquery will succeed if you are an admin.
CREATE POLICY "Admins can view all admins"
  ON public.admin_users FOR SELECT
  USING ( 
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid()
    ) 
  );

-- Ensure the user exists (just in case the previous script failed silently)
-- Re-run the user creation logic safely
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  user_email text := 'esskvy111@gmail.com';
  user_password text := 'password123';
BEGIN
  -- Insert into auth.users if needed
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
      user_email, crypt(user_password, gen_salt('bf')), now(), now(), NULL,
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    INSERT INTO public.admin_users (id, email, role) VALUES (new_user_id, user_email, 'owner');
    RAISE NOTICE 'User % created', user_email;
  ELSE
    -- Ensure in admin_users
    DECLARE existing_id uuid;
    BEGIN
      SELECT id INTO existing_id FROM auth.users WHERE email = user_email;
      IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = existing_id) THEN
        INSERT INTO public.admin_users (id, email, role) VALUES (existing_id, user_email, 'owner');
        RAISE NOTICE 'Existing user % added to admin_users', user_email;
      END IF;
    END;
  END IF;
END $$;
