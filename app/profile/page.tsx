import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ProfileForm } from "@/components/ProfileForm";
import { profileFromRow } from "@/lib/profile";
import { updateProfile } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/profile");

  const { data: row } = await supabase
    .from("profiles")
    .select("restrictions, may_contain, macros")
    .eq("id", user.id)
    .maybeSingle();

  const initial = profileFromRow(row);

  return (
    <>
      <NavBar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            {user.email}
          </span>
          <h1 className="mt-3 font-display text-3xl text-text sm:text-4xl">My profile</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
            This is exactly what the TrustTag companion checks against as you shop.
          </p>

          {params.saved && (
            <p className="mt-4 text-sm text-safe">Saved — this takes effect immediately.</p>
          )}
          {params.error && <p className="mt-4 text-sm text-unsafe">{params.error}</p>}

          <div className="mt-10">
            <ProfileForm action={updateProfile} initial={initial} submitLabel="Save changes" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
