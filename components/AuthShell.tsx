import Link from "next/link";
import { LogoMark } from "./LogoMark";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="px-6 pt-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="text-[15px] font-semibold tracking-tight text-text">TrustTag</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            {eyebrow}
          </span>
          <h1 className="mt-3 font-display text-3xl text-text">{title}</h1>
          <p className="mt-2 text-sm text-text-muted">{subtitle}</p>

          <div className="mt-8 rounded-2xl border border-border bg-ink-2 p-6">{children}</div>

          <p className="mt-6 text-center text-sm text-text-muted">{footer}</p>
        </div>
      </div>
    </main>
  );
}

export function FormField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <input
        {...props}
        className="mt-1.5 block w-full rounded-lg border border-border bg-ink px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </label>
  );
}
