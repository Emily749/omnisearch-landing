import Link from "next/link";
import { AuthShell, FormField } from "@/components/AuthShell";
import { signIn, sendMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; magicLinkSent?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/shop";

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to TrustTag"
      subtitle="Pick up right where you left off — your saved profile is waiting."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand hover:text-brand-strong">
            Create a free profile
          </Link>
        </>
      }
    >
      {params.magicLinkSent ? (
        <p className="text-sm text-text">
          Check your inbox — we&apos;ve sent a sign-in link to your email.
        </p>
      ) : (
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <FormField label="Email" type="email" name="email" required autoComplete="email" />
          <FormField
            label="Password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />

          {params.error && <p className="text-sm text-unsafe">{params.error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-strong hover:text-white"
          >
            Log in
          </button>

          <button
            formAction={sendMagicLink}
            className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-text transition hover:border-text-muted"
          >
            Email me a sign-in link instead
          </button>
        </form>
      )}
    </AuthShell>
  );
}
