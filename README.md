# TrustTag

Consumer web app for TrustTag: sign up, build an allergen/dietary profile,
and continue through to Tesco, Sainsbury's or Waitrose with the [TrustTag
Companion](../trusttag-extension) extension highlighting products against
that profile as you shop.

## Stack

Next.js (App Router) + Tailwind v4 + Supabase (auth + Postgres, via
`@supabase/ssr`).

## First-time setup

1. **Create a Supabase project** at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql` — creates
   `profiles` (dietary data, RLS-protected per user) and `clickthroughs`
   (affiliate click log).
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project
     Settings → API.
   - `TRUSTTAG_EXTENSION_KEY` — any secret string; the extension sends it
     back on every `/api/evaluate` call as a light abuse gate.
   - `AFFILIATE_TEMPLATE_*` — once you're approved for each retailer's
     affiliate program (usually via Awin, CJ or Rakuten Advertising), put
     your tracking URL here. Until then these fall back to the retailer's
     plain grocery URL, so "Continue to Tesco" still works — you just won't
     earn commission.
4. In Supabase Auth settings, add `http://localhost:3000/auth/callback` (and
   your production equivalent) to the redirect allow-list.
5. `npm install && npm run dev`.

## Deploying

Push to GitHub and import into Vercel — it's already a Next.js project, no
extra config needed. Set the same env vars from `.env.local` in the Vercel
project settings, plus `NEXT_PUBLIC_SITE_URL` pointing at your production
domain, and add that domain to Supabase's redirect allow-list.

Once you have a real domain, update `manifest.json` in the extension repo so
it can detect installs there too.

## Retailer logos

Retailer cards use text initials, not Tesco/Sainsbury's/Waitrose's actual
logos — using their trademarks on a commercial affiliate site without
permission is a real legal risk. Swap in licensed marks if you get sign-off.
