-- Migration: Add stock management to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false;

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS stock_level INTEGER;
