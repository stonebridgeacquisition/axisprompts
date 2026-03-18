-- AI Agent Schema: Context & History
-- Enable Vector Extension for Knowledge Base
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Chat Sessions (History)
-- Tracks conversation history per user PER BUSINESS.
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL, -- The Business
    manychat_user_id TEXT NOT NULL, -- The End User (Customer)
    user_name TEXT, -- "John Doe"
    platform TEXT DEFAULT 'instagram',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, manychat_user_id) -- One session per user per business
);

-- 2. Chat Messages (Individual bubbles)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Knowledge Base (Embeddings)
-- Stores business-specific info (e.g., "We close at 9pm")
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768), -- For Gemini/OpenAI embeddings
    metadata JSONB DEFAULT '{}', -- e.g., {"source": "menu_scan"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Brand Prompts (System Instructions)
-- Custom personality for each agent
CREATE TABLE IF NOT EXISTS public.brand_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
    system_prompt TEXT NOT NULL DEFAULT 'You are a helpful assistant for this restaurant.',
    tone TEXT DEFAULT 'friendly', -- e.g., "Professional", "Fun", "Pidgin"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES (Security)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can only see THEIR own data
CREATE POLICY "Clients view own sessions" ON public.chat_sessions
    USING (auth.uid() IN (SELECT user_id FROM public.clients WHERE id = client_id));

CREATE POLICY "Clients view own messages" ON public.chat_messages
    USING (session_id IN (SELECT id FROM public.chat_sessions WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())));

CREATE POLICY "Clients view own KB" ON public.knowledge_base
    USING (auth.uid() IN (SELECT user_id FROM public.clients WHERE id = client_id));

CREATE POLICY "Clients view own prompts" ON public.brand_prompts
    USING (auth.uid() IN (SELECT user_id FROM public.clients WHERE id = client_id));

-- Indexes for Speed
CREATE INDEX idx_chat_sessions_client_user ON public.chat_sessions(client_id, manychat_user_id);
