-- 1. Enable pgcrypto (for password hashing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the admin_users table (if not exists)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text NOT NULL,
  role text DEFAULT 'admin',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Drop existing first to avoid errors)
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admin_users;
CREATE POLICY "Admins can view all admins"
  ON public.admin_users FOR SELECT
  USING ( auth.uid() IN (SELECT id FROM public.admin_users) );

-- 5. Insert the initial admin user
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  user_email text := 'esskvy111@gmail.com';
  user_password text := 'password123';
BEGIN
  -- Only insert into auth.users if user doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      user_email,
      crypt(user_password, gen_salt('bf')),
      now(),
      now(),
             NULL,
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    -- Insert into admin_users (linked via ID)
    INSERT INTO public.admin_users (id, email, role)
    VALUES (new_user_id, user_email, 'owner');
    
    RAISE NOTICE 'User % created successfully with ID %', user_email, new_user_id;

  ELSE
    -- If user exists in auth.users, check if they are in admin_users
    DECLARE
        existing_user_id uuid;
    BEGIN
        SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email;
        
        IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = existing_user_id) THEN
            INSERT INTO public.admin_users (id, email, role)
            VALUES (existing_user_id, user_email, 'owner');
            RAISE NOTICE 'Added existing user % to admin_users', user_email;
        ELSE
            RAISE NOTICE 'User % is already an admin', user_email;
        END IF;
    END;
  END IF;
END $$;
