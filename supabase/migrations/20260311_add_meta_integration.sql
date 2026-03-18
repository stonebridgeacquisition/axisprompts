-- Migration: Add Meta/Facebook integration fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS fb_page_id text,
ADD COLUMN IF NOT EXISTS ig_account_id text,
ADD COLUMN IF NOT EXISTS fb_page_access_token text;
