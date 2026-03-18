-- STRICT SAFETY POLICIES & CONSTRAINTS

-- 1. Enforce Paystack Subaccount Format
-- Prevents "test" or "garbage" codes from being saved.
ALTER TABLE public.clients
ADD CONSTRAINT check_paystack_subaccount_format
CHECK (
    paystack_subaccount_code IS NULL OR 
    paystack_subaccount_code ~ '^ACCT_[a-zA-Z0-9]+$'
);

-- 2. Strict Order Isolation
-- Ensure no one can insert an order for a client they don't own (via API)
-- Note: Webhooks bypass RLS (service_role), so this protects the Frontend API.
DROP POLICY IF EXISTS "Clients manage own orders" ON public.orders;

CREATE POLICY "Clients manage own orders" ON public.orders
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
    WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- 3. Prevent "Orphaned" Key Data
-- Ensure every order has a valid client linkage.
ALTER TABLE public.orders
ALTER COLUMN client_id SET NOT NULL;

-- 4. Audit Logging Trigger (Optional but recommended)
-- Logs any change to critical tables
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT,
    record_id UUID,
    operation TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log changes
CREATE OR REPLACE FUNCTION log_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on Client Settings (e.g. changing subaccount code)
DROP TRIGGER IF EXISTS log_client_changes ON public.clients;
CREATE TRIGGER log_client_changes
AFTER UPDATE OF paystack_subaccount_code, business_name
ON public.clients
FOR EACH ROW EXECUTE FUNCTION log_sensitive_changes();
