import Link from "next/link";
import { LogoMark } from "./LogoMark";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-ink">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <LogoMark size={24} />
              <span className="text-sm font-semibold text-text">TrustTag</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Independent allergen and dietary verification for online grocery shopping.
              Always check the physical label — TrustTag is a second check, not a substitute
              for it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="font-medium text-text">Company</p>
              <ul className="mt-3 space-y-2 text-text-muted">
                <li>
                  <Link href="/#mission" className="transition hover:text-text">
                    Our mission
                  </Link>
                </li>
                <li>
                  <Link href="/#how-it-works" className="transition hover:text-text">
                    How it works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-text">Legal</p>
              <ul className="mt-3 space-y-2 text-text-muted">
                <li>
                  <Link href="/privacy" className="transition hover:text-text">
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition hover:text-text">
                    Terms of service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-text">Account</p>
              <ul className="mt-3 space-y-2 text-text-muted">
                <li>
                  <Link href="/signup" className="transition hover:text-text">
                    Create profile
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="transition hover:text-text">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/80 pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} TrustTag. All rights reserved.</span>
          <span>
            Some links to retailers are affiliate links — TrustTag may earn a commission on
            purchases at no extra cost to you.
          </span>
        </div>
      </div>
    </footer>
  );
}
