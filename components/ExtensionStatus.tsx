"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "installed" | "missing";

export function ExtensionStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.type === "TRUSTTAG_EXTENSION_PRESENT") {
        setStatus("installed");
      }
    }

    window.addEventListener("message", onMessage);
    window.postMessage({ type: "TRUSTTAG_PING" }, window.location.origin);

    const retry = setTimeout(
      () => window.postMessage({ type: "TRUSTTAG_PING" }, window.location.origin),
      300
    );
    const timeout = setTimeout(() => setStatus((s) => (s === "checking" ? "missing" : s)), 1200);

    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(retry);
      clearTimeout(timeout);
    };
  }, []);

  if (status === "checking") return null;

  if (status === "installed") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-text">
        <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
        TrustTag companion is active — highlighting will appear as you browse.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-text sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
        Install the free companion to see live highlights on the retailer&apos;s site.
      </span>
      <a
        href="/extension"
        className="whitespace-nowrap rounded-full border border-border px-4 py-1.5 text-xs font-medium text-text transition hover:border-text-muted"
      >
        Get the companion
      </a>
    </div>
  );
}
