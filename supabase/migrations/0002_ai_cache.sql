-- Content-addressed cache for the optional AI category extraction pass
-- (see lib/ai-categorize.ts). Keyed by a hash of the product text itself,
-- not a user or retailer, so a given product's ingredients only ever cost
-- one AI call, ever, no matter how many people check it. Contains no
-- personal data — just detected allergen categories for public product
-- text — so it's fine for the anon key to read/write it directly.

create table if not exists public.product_ai_cache (
  cache_key text primary key,
  ingredient_categories text[] not null default '{}',
  trace_categories text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.product_ai_cache enable row level security;

create policy "ai cache: anyone can read" on public.product_ai_cache
  for select using (true);

create policy "ai cache: anyone can write" on public.product_ai_cache
  for insert with check (true);

create policy "ai cache: anyone can update" on public.product_ai_cache
  for update using (true);
