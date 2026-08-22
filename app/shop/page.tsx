import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ExtensionStatus } from "@/components/ExtensionStatus";
import { RetailerBadge } from "@/components/RetailerBadge";
import { RETAILERS } from "@/lib/retailers";
import { profileFromRow } from "@/lib/profile";
import Link from "next/link";

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/shop");

  const { data: row } = await supabase
    .from("profiles")
    .select("restrictions, may_contain, macros")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileFromRow(row);
  const profileIsEmpty = profile.restrictions.length === 0 && profile.mayContain.length === 0;

  return (
    <>
      <NavBar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Shop
          </span>
          <h1 className="mt-3 font-display text-3xl text-text sm:text-4xl">
            Where would you like to shop?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
            You&apos;ll continue to the retailer&apos;s own site to browse and checkout as
            normal.
          </p>

          {profileIsEmpty && (
            <div className="mt-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-text">
              Your profile is empty, so nothing will be flagged yet.{" "}
              <Link href="/profile" className="font-medium underline hover:text-text">
                Set up your allergens
              </Link>
              .
            </div>
          )}

          <div className="mt-6">
            <ExtensionStatus />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {RETAILERS.map((retailer) => (
              <div
                key={retailer.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-ink-2 p-6"
              >
                <div>
                  <RetailerBadge retailer={retailer} />
                  <p className="mt-4 text-sm text-text-muted">{retailer.tagline}</p>
                </div>
                <a
                  href={`/api/go/${retailer.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-brand py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-strong hover:text-white"
                >
                  Continue to {retailer.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
