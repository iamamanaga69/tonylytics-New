-- FitRivals Chat Table Setup.
-- Run this script in the Supabase Dashboard > SQL Editor to enable partner chat.

-- 1. Create chat messages table
create table if not exists public.duogym_chat (
  id uuid primary key default gen_random_uuid(),
  sender text not null,
  receiver text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.duogym_chat enable row level security;

-- 3. Create public/anonymous select and insert policies (supporting bypass logins)
drop policy if exists "Allow public select chat" on public.duogym_chat;
create policy "Allow public select chat"
on public.duogym_chat for select
using (true);

drop policy if exists "Allow public insert chat" on public.duogym_chat;
create policy "Allow public insert chat"
on public.duogym_chat for insert
with check (true);

-- 4. Grant full access permissions
grant all on public.duogym_chat to anon, authenticated;

-- 5. Enable real-time replication for immediate messaging updates
alter publication supabase_realtime add table public.duogym_chat;
