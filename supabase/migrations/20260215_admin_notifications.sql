-- Add system notification columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'notification',
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add index for performance on system notifications
CREATE INDEX IF NOT EXISTS idx_notifications_is_system ON public.notifications(is_system);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Ensure RLS allows admins to see system notifications
DROP POLICY IF EXISTS "Admins can view system notifications" ON public.notifications;
CREATE POLICY "Admins can view system notifications"
ON public.notifications FOR SELECT
USING (
  is_system = true 
  OR 
  auth.uid() IN (SELECT id FROM public.admin_users)
);

-- Policy for system notification insertion
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true); -- Allow service role and triggers
