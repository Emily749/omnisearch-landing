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

export default function TermsPage() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Legal
          </span>
          <h1 className="mt-3 font-display text-3xl text-text sm:text-4xl">Terms of service</h1>
          <p className="mt-3 text-sm text-text-muted">Last updated 15 August 2026.</p>

          <div className="mt-10">
            <Section title="Not a medical device">
              <p>
                TrustTag is a decision-support tool, not a medical device and not medical
                advice. It is built to reduce the chance of missing an allergen or dietary
                conflict, but ingredient data can be incomplete, mislabelled, or change
                between when it was checked and when a product is packed. Always read the
                physical product label before eating or serving anything, particularly for
                severe or life-threatening allergies.
              </p>
            </Section>
            <Section title="Your account">
              <p>
                You&apos;re responsible for keeping your login details secure and for the
                accuracy of the dietary profile you save — TrustTag can only check against
                what you tell it.
              </p>
            </Section>
            <Section title="Affiliate relationships">
              <p>
                TrustTag earns a commission when you buy something after clicking through to
                a retailer from our site, via that retailer&apos;s affiliate program. This
                does not affect the price you pay, and does not influence which products are
                flagged as safe or unsafe for your profile.
              </p>
            </Section>
            <Section title="Acceptable use">
              <p>
                Don&apos;t attempt to disrupt, scrape at scale, or reverse engineer TrustTag
                or the retailers we link to beyond ordinary personal use.
              </p>
            </Section>
            <Section title="Changes">
              <p>
                We may update these terms as TrustTag grows. Material changes will be
                reflected here with an updated date.
              </p>
            </Section>
            <Section title="Contact">
              <p>Questions about these terms: hello@trusttag.app</p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
