import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

const STEPS = [
  {
    title: "Download the companion",
    body: "Grab trusttag-extension.zip below and unzip it — you'll get a trusttag-extension folder.",
  },
  {
    title: "Open Chrome's extensions page",
    body: "Go to chrome://extensions and turn on Developer mode using the toggle in the top right.",
  },
  {
    title: "Load it",
    body: "Click \"Load unpacked\" and select the unzipped trusttag-extension folder.",
  },
  {
    title: "Sign in",
    body: "Open the TrustTag icon in your toolbar and sign in with the same account you used here — your saved profile syncs automatically.",
  },
];

export default function ExtensionPage() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Companion
          </span>
          <h1 className="mt-3 font-display text-3xl text-text sm:text-4xl">
            Get the TrustTag companion
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-muted">
            TrustTag isn&apos;t in the Chrome Web Store yet, so for now it installs the way
            developers test extensions — it&apos;s four short steps, and only takes a
            minute.
          </p>

          <a
            href="/trusttag-extension.zip"
            download
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-strong hover:text-white"
          >
            Download trusttag-extension.zip
          </a>

          <ol className="mt-10 space-y-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-text">{step.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 text-xs text-text-muted">
            Prefer to shop without it? Your profile still saves normally — you just
            won&apos;t see highlights on the retailer&apos;s page.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
