import { Retailer } from "@/lib/retailers";

export function RetailerBadge({ retailer }: { retailer: Retailer }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-3 text-sm font-semibold tracking-wide text-text ring-1 ring-border">
        {retailer.initials}
      </div>
      <div>
        <p className="font-medium text-text">{retailer.name}</p>
        <p className="text-xs text-text-muted">{retailer.domain}</p>
      </div>
    </div>
  );
}
