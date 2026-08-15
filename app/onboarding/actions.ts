"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileFromFormData } from "@/lib/profile";

export async function saveOnboardingProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  const profile = profileFromFormData(formData);

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    restrictions: profile.restrictions,
    may_contain: profile.mayContain,
    macros: profile.macros,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/shop");
}
