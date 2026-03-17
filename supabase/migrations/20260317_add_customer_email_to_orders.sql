-- Add customer_email to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
