import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "./LogoMark";
import { SignOutButton } from "./SignOutButton";

export async function NavBar() {
  let user = null;
  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("NavBar: Supabase auth check failed — rendering signed-out state.", error);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[17px] font-semibold tracking-tight text-text">TrustTag</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-text-muted md:flex">
          <Link href="/#how-it-works" className="transition hover:text-text">
            How it works
          </Link>
          <Link href="/#mission" className="transition hover:text-text">
            Our mission
          </Link>
          <Link href="/#retailers" className="transition hover:text-text">
            Retailers
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/shop"
                className="hidden text-sm text-text-muted transition hover:text-text sm:block"
              >
                Shop
              </Link>
              <Link
                href="/profile"
                className="hidden text-sm text-text-muted transition hover:text-text sm:block"
              >
                My profile
              </Link>
              <SignOutButton className="text-sm text-text-muted transition hover:text-text" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-text-muted transition hover:text-text"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-strong hover:text-white"
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
