-- Add daily_stock column to menu_items
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS daily_stock INTEGER DEFAULT NULL;

-- Create function to reset stock based on daily_stock
-- We only update items that actually have a daily_stock value set
CREATE OR REPLACE FUNCTION public.reset_daily_stock()
RETURNS void AS $$
BEGIN
    UPDATE public.menu_items
    SET stock_level = daily_stock
    WHERE daily_stock IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the reset at Midnight (00:00) West Africa Time (WAT)
-- WAT is UTC+1. So Midnight WAT is 23:00 UTC the previous day.
-- Cron format: min hour dom mon dow
-- 0 23 * * * means 23:00 UTC (which is exactly 00:00 WAT)
SELECT cron.schedule('reset-daily-stock', '0 23 * * *', 'SELECT public.reset_daily_stock()');
