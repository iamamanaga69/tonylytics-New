-- FitRivals authentication profile layer.
-- Run once in Supabase Dashboard > SQL Editor.

create table if not exists public.fitrivals_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  auth_email text not null,
  rival_username text null references public.fitrivals_profiles(username) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fitrivals_profiles enable row level security;

drop policy if exists "Profiles are readable for rivalry" on public.fitrivals_profiles;
create policy "Profiles are readable for rivalry"
on public.fitrivals_profiles for select
to authenticated
using (true);

drop policy if exists "Users create their profile" on public.fitrivals_profiles;
create policy "Users create their profile"
on public.fitrivals_profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users update their profile" on public.fitrivals_profiles;
create policy "Users update their profile"
on public.fitrivals_profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

revoke all on public.fitrivals_profiles from anon;
revoke all on public.fitrivals_profiles from authenticated;
grant select (id, username, display_name, rival_username, created_at, updated_at)
  on public.fitrivals_profiles to authenticated;
grant insert (id, username, display_name, auth_email, rival_username)
  on public.fitrivals_profiles to authenticated;
grant update (display_name, rival_username, updated_at)
  on public.fitrivals_profiles to authenticated;

create or replace function public.resolve_fitrivals_login(login_name text)
returns table(email text)
language sql
security definer
set search_path = public
stable
as $$
  select p.auth_email
  from public.fitrivals_profiles p
  where p.username = lower(trim(login_name))
  limit 1;
$$;

revoke all on function public.resolve_fitrivals_login(text) from public;
grant execute on function public.resolve_fitrivals_login(text) to anon, authenticated;

create or replace function public.set_fitrivals_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fitrivals_profiles_updated_at on public.fitrivals_profiles;
create trigger fitrivals_profiles_updated_at
before update on public.fitrivals_profiles
for each row execute function public.set_fitrivals_profile_updated_at();

-- Table for user fitness and diet data sync
create table if not exists public.duogym_users_data (
  username text primary key,
  fitness_data jsonb not null default '{}'::jsonb,
  diet_data jsonb not null default '{}'::jsonb,
  last_synced timestamptz not null default now()
);

-- Enable RLS
alter table public.duogym_users_data enable row level security;

-- Policies for public (anon) and authenticated read/write
drop policy if exists "Allow public read access" on public.duogym_users_data;
create policy "Allow public read access"
on public.duogym_users_data for select
using (true);

drop policy if exists "Allow public insert access" on public.duogym_users_data;
create policy "Allow public insert access"
on public.duogym_users_data for insert
with check (true);

drop policy if exists "Allow public update access" on public.duogym_users_data;
create policy "Allow public update access"
on public.duogym_users_data for update
using (true)
with check (true);

-- Grant permissions to both anon and authenticated roles
grant all on public.duogym_users_data to anon, authenticated;

