create table if not exists public.agent_evaluations (
    id uuid default gen_random_uuid() primary key,
    session_id uuid references public.chat_sessions(id) on delete cascade not null,
    business_id uuid references public.clients(id) on delete cascade not null,
    rating integer check (rating >= 1 and rating <= 10),
    summary text,
    worked text,
    didnt_work text,
    problem text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Protect the table
alter table public.agent_evaluations enable row level security;

-- Admin can see evaluations
create policy "Enable access for authenticated users only" on public.agent_evaluations
    for all using (auth.role() = 'authenticated');
