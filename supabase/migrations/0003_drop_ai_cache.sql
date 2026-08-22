-- The Gemini-based AI second pass was replaced with a direct Open Food
-- Facts lookup by barcode (see lib/off-lookup.ts) — no key, no rate
-- limit fragility, and no need for a cache table, since OFF's own API is
-- fast enough to call directly on each request.

drop table if exists public.product_ai_cache;
