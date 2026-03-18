-- Add agent_name to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_name TEXT DEFAULT 'Jade';
