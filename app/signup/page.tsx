import Link from "next/link";
import { AuthShell, FormField } from "@/components/AuthShell";
import { signUp } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirmEmail?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your free profile"
      subtitle="Two minutes now saves a label check on every product, every time."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-strong">
            Log in
          </Link>
        </>
      }
    >
      {params.confirmEmail ? (
        <p className="text-sm text-text">
          Almost there — check your inbox and confirm your email to finish setting up your
          profile.
        </p>
      ) : (
        <form action={signUp} className="space-y-4">
          <FormField label="Email" type="email" name="email" required autoComplete="email" />
          <FormField
            label="Password"
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="text-xs text-text-muted">At least 8 characters.</p>

          {params.error && <p className="text-sm text-unsafe">{params.error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-strong hover:text-white"
          >
            Create profile
          </button>

          <p className="text-center text-xs text-text-muted">
            By continuing you agree to TrustTag&apos;s{" "}
            <Link href="/terms" className="underline hover:text-text">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-text">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      )}
    </AuthShell>
  );
}
