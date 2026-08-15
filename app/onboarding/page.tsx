import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ProfileForm } from "@/components/ProfileForm";
import { EMPTY_PROFILE } from "@/lib/allergens";
import { saveOnboardingProfile } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  return (
    <>
      <NavBar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Step 1 of 1
          </span>
          <h1 className="mt-3 font-display text-3xl text-text sm:text-4xl">
            What should TrustTag watch for?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
            Select everything that applies. You can change this anytime from{" "}
            <span className="text-text">My profile</span> — it takes effect on your next
            shop instantly.
          </p>

          {params.error && <p className="mt-4 text-sm text-unsafe">{params.error}</p>}

          <div className="mt-10">
            <ProfileForm
              action={saveOnboardingProfile}
              initial={EMPTY_PROFILE}
              submitLabel="Save and continue to shop"
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
