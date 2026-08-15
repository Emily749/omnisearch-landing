import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/80 py-8 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Legal
          </span>
          <h1 className="mt-3 font-display text-3xl text-text sm:text-4xl">Privacy policy</h1>
          <p className="mt-3 text-sm text-text-muted">Last updated 15 August 2026.</p>

          <div className="mt-10">
            <Section title="What we store">
              <p>
                When you create a TrustTag account we store your email address and the
                dietary profile you build (allergens, &ldquo;may contain&rdquo; traces,
                lifestyle choices and any macro thresholds you set). This is stored with
                Supabase, our database provider, and protected by row-level security so only
                you can read or change it.
              </p>
            </Section>
            <Section title="How your profile is used">
              <p>
                Your profile is used only to evaluate products against your requirements —
                both on trusttag.com and, if you install it, inside the TrustTag browser
                companion. We do not sell your dietary or health data, and we do not use it
                for advertising.
              </p>
            </Section>
            <Section title="Affiliate links and click data">
              <p>
                Links that take you to a retailer&apos;s site are affiliate links. When you
                click through, we may record which retailer you visited and, if you&apos;re
                logged in, associate that click with your account so we can measure how
                TrustTag is used. We do not see or store what you actually purchase — that
                information stays with the retailer and their affiliate network.
              </p>
            </Section>
            <Section title="The browser companion">
              <p>
                The TrustTag companion extension reads product information on the page
                you&apos;re viewing and compares it against your saved profile, entirely to
                show you a result. It does not transmit your browsing history to TrustTag.
              </p>
            </Section>
            <Section title="Your rights">
              <p>
                You can edit or delete your profile data at any time from your account
                settings, or by emailing us to request full account deletion.
              </p>
            </Section>
            <Section title="Contact">
              <p>Questions about this policy: hello@trusttag.app</p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
