-- Add agent_name column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS agent_name text DEFAULT 'Jade';

-- Comment for clarity
COMMENT ON COLUMN public.clients.agent_name IS 'The custom name for the AI Agent (e.g. Jade, Sarah, Alex).';
