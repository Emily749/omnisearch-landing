-- TrustTag core schema: user dietary profiles + affiliate clickthrough log.
-- Run this in the Supabase SQL editor for your project (or via `supabase db push`).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  restrictions text[] not null default '{}',
  may_contain text[] not null default '{}',
  macros jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own row" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: insert own row" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles: update own row" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create an empty profile row the moment someone signs up, so every
-- authenticated user has one to read/update without a race on first load.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Best-effort log of "continue to retailer" clicks, used to reconcile
-- affiliate revenue and understand which retailers are actually used.
create table if not exists public.clickthroughs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  retailer text not null,
  created_at timestamptz not null default now()
);

alter table public.clickthroughs enable row level security;

create policy "clickthroughs: anyone can log a click" on public.clickthroughs
  for insert with check (true);
