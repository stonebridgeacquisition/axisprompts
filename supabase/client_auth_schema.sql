-- 1. Add user_id to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Cleanup duplicate emails before applying unique constraint
-- This keeps the most recently created record and deletes others with the same email
DELETE FROM public.clients a
USING public.clients b
WHERE a.created_at < b.created_at
  AND a.email = b.email;

-- 3. Ensure emails are unique in clients table
ALTER TABLE public.clients 
DROP CONSTRAINT IF EXISTS clients_email_key;
ALTER TABLE public.clients 
ADD CONSTRAINT clients_email_key UNIQUE (email);

-- 4. Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Allow clients to view/edit ONLY their own data
DROP POLICY IF EXISTS "Clients can view own data" ON public.clients;
CREATE POLICY "Clients can view own data"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Clients can update own data" ON public.clients;
CREATE POLICY "Clients can update own data"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id);

-- Allow Admins (service role or admin_users) to view all
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
CREATE POLICY "Admins can view all clients"
ON public.clients FOR ALL
USING ( 
  auth.jwt() ->> 'role' = 'service_role' 
  OR 
  EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
);

-- 5. Auto-link Trigger
-- When a new Auth User is created, check if a Client exists with that email.
-- If yes, update the Client's user_id.

CREATE OR REPLACE FUNCTION public.link_client_to_new_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clients
  SET user_id = NEW.id
  WHERE email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_link_client ON auth.users;
CREATE TRIGGER on_auth_user_created_link_client
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_client_to_new_user();
