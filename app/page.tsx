import Link from "next/link";
import Image from "next/image";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { RetailerBadge } from "@/components/RetailerBadge";
import { RETAILERS } from "@/lib/retailers";

const STEPS = [
  {
    number: "01",
    title: "Build your profile",
    body: "Tell TrustTag what you're avoiding — allergens, intolerances, or a lifestyle like halal, vegan or low-FODMAP. Takes about ninety seconds.",
  },
  {
    number: "02",
    title: "Add the companion",
    body: "A small, free browser extension reads your saved profile so it can check products as you browse — nothing is ever typed twice.",
  },
  {
    number: "03",
    title: "Shop as normal",
    body: "Continue to Tesco, Sainsbury's or Waitrose from TrustTag. Every product gets a clear safe, caution or conflict marker before it reaches your basket.",
  },
];

const STATS = [
  { value: "17", label: "Allergens & intolerances covered" },
  { value: "<1s", label: "Per-product check, live as you browse" },
  { value: "3", label: "Retailers today — more on the way" },
];

const LEGEND = [
  {
    color: "var(--safe)",
    label: "Safe",
    body: "Nothing in your profile was found — shop normally.",
  },
  {
    color: "var(--caution)",
    label: "Caution",
    body: "A “may contain” trace warning matches something you flagged.",
  },
  {
    color: "var(--unsafe)",
    label: "Conflict",
    body: "A real ingredient matches a restriction in your profile.",
  },
];

export default function Home() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] opacity-40"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 0%, var(--brand-soft) 0%, transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-ink-2 px-3 py-1 text-xs font-medium text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Now covering Tesco, Sainsbury&apos;s &amp; Waitrose
            </span>

            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.08] tracking-tight text-text sm:text-6xl">
              Every ingredient, checked against the one thing that matters —{" "}
              <span className="italic text-brand">you.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
              TrustTag sets up your allergen and dietary profile once, then quietly checks
              every product for you as you shop the UK&apos;s biggest supermarkets online.
              Green means go. No more turning packets over three times.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-strong hover:text-white"
              >
                Build your free profile
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-full border border-border px-6 py-3 text-sm font-medium text-text transition hover:border-text-muted"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative mx-auto max-w-6xl px-6 pb-24">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
              {STATS.map((stat) => (
                <div key={stat.label} className="bg-ink-2 px-6 py-8">
                  <p className="font-display text-3xl text-text">{stat.value}</p>
                  <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-border/80 bg-ink-2/40">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="max-w-xl">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                How it works
              </span>
              <h2 className="mt-3 font-display text-3xl text-text sm:text-4xl">
                Three steps between you and a worry-free basket.
              </h2>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.number}>
                  <span className="font-display text-2xl text-brand">{step.number}</span>
                  <h3 className="mt-3 text-lg font-semibold text-text">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="border-t border-border/80">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="max-w-xl">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                See it in action
              </span>
              <h2 className="mt-3 font-display text-3xl text-text sm:text-4xl">
                Every card, coloured before you click.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-text-muted">
                Real results from a live Sainsbury&apos;s search, with gluten flagged as a
                restriction. No screenshots were staged for this — that&apos;s the
                companion running as you&apos;d actually see it.
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-ink-2">
              <Image
                src="/demo-tricolor.png"
                alt="Sainsbury's granola search results, each product card automatically bordered green for safe, amber for a may-contain caution, or red for a confirmed gluten conflict"
                width={1568}
                height={425}
                sizes="(min-width: 1152px) 1152px, 100vw"
                className="w-full"
              />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {LEGEND.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-xl border border-border bg-ink-2 p-4"
                >
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ background: item.color }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-text">{item.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-border bg-ink-2">
                <Image
                  src="/demo-tesco.png"
                  alt="Tesco chocolate search results with every product card bordered green as safe for the saved profile"
                  width={1568}
                  height={549}
                  sizes="(min-width: 1152px) 560px, 100vw"
                  className="w-full"
                />
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-ink-2">
                <Image
                  src="/demo-unsafe.png"
                  alt="Sainsbury's cookie search results with several product cards bordered red and labelled Contains GLUTEN"
                  width={1568}
                  height={642}
                  sizes="(min-width: 1152px) 560px, 100vw"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/80">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="max-w-xl">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                The difference
              </span>
              <h2 className="mt-3 font-display text-3xl text-text sm:text-4xl">
                From a wall of small print to a single, clear answer.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-ink-2 p-7">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Without TrustTag
                </span>
                <p className="mt-4 text-sm leading-relaxed text-text-muted">
                  &ldquo;Milk powder, soy lecithin, wheat starch, natural flavouring. May
                  contain traces of peanuts, sesame, mustard.&rdquo; No summary. No flag for
                  your profile. You read it again, just to be sure.
                </p>
              </div>
              <div className="rounded-2xl border border-brand/30 bg-brand-soft p-7">
                <span className="text-xs font-medium uppercase tracking-wide text-brand">
                  With TrustTag
                </span>
                <p className="mt-4 text-sm leading-relaxed text-text">
                  <span className="font-semibold text-safe">Safe for your profile.</span>{" "}
                  Checked against your saved allergens and traces in under a second, with the
                  exact ingredient flagged the moment it isn&apos;t.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="mission" className="border-t border-border/80 bg-ink-2/40">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
              Our mission
            </span>
            <p className="mt-6 font-display text-3xl leading-snug text-text sm:text-4xl">
              &ldquo;I&apos;m coeliac, and I built the tool I wished existed — one that reads
              the label before I have to, every single time.&rdquo;
            </p>
            <p className="mt-8 text-base leading-relaxed text-text-muted">
              TrustTag exists because dietary restrictions shouldn&apos;t mean a slower,
              more anxious version of grocery shopping. Whether you&apos;re managing a
              diagnosed allergy, a lifelong intolerance, or a diet rooted in faith or
              health, you deserve a clear answer before something reaches your basket —
              not after you&apos;ve unpacked the bag. We built TrustTag to be that second
              pair of eyes: careful, consistent, and always on.
            </p>
          </div>
        </section>

        <section id="retailers" className="border-t border-border/80">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                  Supported retailers
                </span>
                <h2 className="mt-3 font-display text-3xl text-text sm:text-4xl">
                  Shop the stores you already use.
                </h2>
              </div>
              <p className="max-w-xs text-sm text-text-muted">
                More UK supermarkets are being added — starting with the three below.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {RETAILERS.map((retailer) => (
                <div
                  key={retailer.id}
                  className="rounded-2xl border border-border bg-ink-2 p-6 transition hover:border-brand/40"
                >
                  <RetailerBadge retailer={retailer} />
                  <p className="mt-4 text-sm text-text-muted">{retailer.tagline}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/80">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <h2 className="font-display text-3xl text-text sm:text-4xl">
              Set up your profile once. Shop safely everywhere.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-text-muted">
              Free to create, takes under two minutes, and you&apos;re always in control of
              what&apos;s saved.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex rounded-full bg-brand px-7 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-strong hover:text-white"
            >
              Get started free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
